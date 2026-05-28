import { useState, useRef } from "react";
import { DISTRICT_UNIONS } from "@/lib/union-constants";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminLayout from "./layout";
import { useToast } from "@/hooks/use-toast";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Milk,
  IceCream,
  Package,
  Shield,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import {
  UNION_STAFF_DESIGNATIONS,
  WORKFLOW_SEGMENTS,
  buildWorkflowPermissions,
  isSegmentWorkflowDesignation,
} from "@shared/schema";
import { buildXlsxBuffer, parseXlsxToRows } from '@/lib/excel-utils';

const WORKFLOW_TEAMS = [
  { id: 'marketing', label: 'Marketing', designations: (UNION_STAFF_DESIGNATIONS as any).marketing },
  { id: 'production', label: 'Production', designations: (UNION_STAFF_DESIGNATIONS as any).production },
  { id: 'packing', label: 'Packing', designations: (UNION_STAFF_DESIGNATIONS as any).packing },
  { id: 'delivery', label: 'Delivery', designations: (UNION_STAFF_DESIGNATIONS as any).delivery },
];

const ALL_WORKFLOW_DESIGNATIONS = WORKFLOW_TEAMS.flatMap(t => 
  (t.designations || []).map((d: any) => ({ ...d, team: t.id, teamLabel: t.label }))
);

const SEGMENT_OPTIONS = [
  { id: 'FM', label: 'Fresh Milk' },
  { id: 'DP', label: 'Dairy Products' },
  { id: 'IC', label: 'Ice Cream' },
];

const SEGMENT_META: Record<string, { label: string; color: string; bgColor: string; icon: typeof Milk }> = {
  FM: { label: "Fresh Milk", color: "text-blue-800", bgColor: "bg-blue-100", icon: Milk },
  DP: { label: "Dairy Products", color: "text-amber-800", bgColor: "bg-amber-100", icon: Package },
  IC: { label: "Ice Cream", color: "text-pink-800", bgColor: "bg-pink-100", icon: IceCream },
};

function getTeamLabel(desigId: string): string {
  if (desigId.includes('marketing')) return "Marketing";
  if (desigId.includes('production')) return "Production";
  if (desigId.includes('packing')) return "Packing";
  if (desigId.includes('delivery') || desigId === 'delivery_partner' || desigId === 'transport_manager') return "Delivery";
  return "Staff";
}

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  employeeId?: string;
  designation: string;
  designationId: string;
  level: number;
  accessTier: string;
  permissions: string[];
  assignedSegments: string[];
  unionId: string;
  isActive: boolean;
  approvalStatus: string;
  createdAt: string;
}

export default function SegmentStaffPage() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [filterSegment, setFilterSegment] = useState<string>("all");
  const [importing, setImporting] = useState(false);
  const staffFileRef = useRef<HTMLInputElement>(null);

  const { data: staffList = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/admin/segment-staff"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/segment-staff", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/segment-staff"] });
      toast({ title: "Staff Created", description: "Password: Aavin@{last 4 digits of phone}" });
      setShowCreate(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/admin/segment-staff/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/segment-staff"] });
      toast({ title: "Staff Updated" });
      setEditStaff(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/segment-staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/segment-staff"] });
      toast({ title: "Staff Deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const filtered = filterSegment === "all"
    ? staffList
    : staffList.filter((s) => {
        const segs = s.assignedSegments || [];
        return segs.includes(filterSegment);
      });

  const fmCount = staffList.filter((s) => (s.assignedSegments || []).includes("FM")).length;
  const dpCount = staffList.filter((s) => (s.assignedSegments || []).includes("DP")).length;
  const icCount = staffList.filter((s) => (s.assignedSegments || []).includes("IC")).length;

  async function handleExportStaff() {
    try {
      const res = await fetch('/api/admin/segment-staff', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch staff');
      const allStaff: StaffMember[] = await res.json();
      const headers = ['Employee ID', 'Name', 'Phone', 'Email', 'Designation', 'Designation ID', 'Level', 'Access Tier', 'Assigned Segments', 'Union ID', 'Active', 'Approval Status'];
      const dataRows = allStaff.map(s => [
        s.employeeId || '', s.name || '', s.phone || '', s.email || '', s.designation || '', s.designationId || '', String(s.level || ''), s.accessTier || '', (s.assignedSegments || []).join(','), s.unionId || '', s.isActive ? 'Yes' : 'No', s.approvalStatus || '',
      ]);
      const xlsxBuf = await buildXlsxBuffer([{ name: 'Staff', rows: [headers, ...dataRows] }]);
      const blob = new Blob([xlsxBuf.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Staff_Export_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export Complete', description: `Exported ${allStaff.length} staff members` });
    } catch (err: any) {
      toast({ title: 'Export Failed', description: err.message, variant: 'destructive' });
    }
  }

  async function handleStaffFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const { headers, rows: rawRows } = await parseXlsxToRows(buffer);
      const HEADER_MAP: Record<string, string> = {
        'employee id': 'employeeId', 'employeeid': 'employeeId',
        'name': 'name', 'phone': 'phone', 'email': 'email',
        'designation id': 'designationId', 'designationid': 'designationId',
        'designation': 'designation',
        'assigned segments': 'assignedSegments', 'assignedsegments': 'assignedSegments', 'segments': 'assignedSegments',
        'union id': 'unionId', 'unionid': 'unionId',
      };
      const colMap: Record<string, string> = {};
      headers.filter(Boolean).forEach(h => {
        const norm = h.toLowerCase().trim();
        if (HEADER_MAP[norm]) colMap[h] = HEADER_MAP[norm];
      });
      const rows = rawRows.map(raw => {
        const get = (field: string): string => {
          const key = headers.find(h => colMap[h] === field);
          return key ? String(raw[key] ?? '').trim() : '';
        };
        const segStr = get('assignedSegments');
        const segments = segStr ? segStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        return {
          employeeId: get('employeeId'),
          name: get('name'),
          phone: get('phone'),
          email: get('email'),
          designationId: get('designationId'),
          assignedSegments: segments,
          unionId: get('unionId') || 'federation',
        };
      }).filter(r => r.name || r.phone || r.employeeId);

      if (rows.length === 0) {
        toast({ title: 'No Data', description: 'No valid rows found in the file', variant: 'destructive' });
        setImporting(false);
        return;
      }

      const res = await apiRequest('POST', '/api/admin/segment-staff/bulk-import', { rows });
      const result = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/segment-staff'] });
      toast({
        title: 'Import Complete',
        description: `Created: ${result.created || 0}, Updated: ${result.updated || 0}, Errors: ${result.errors?.length || 0}`,
      });
    } catch (err: any) {
      toast({ title: 'Import Failed', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
      if (e.target) e.target.value = '';
    }
  }

  return (
    <AdminLayout>
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Segment Workflow Staff
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage staff accounts for Fresh Milk, Dairy Products, and Ice Cream order workflows
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportStaff} disabled={staffList.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <input ref={staffFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleStaffFileSelect} />
          <Button variant="outline" size="sm" onClick={() => staffFileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Import
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Staff
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: "FM", label: "Fresh Milk", count: fmCount, Icon: Milk, ringColor: "ring-blue-300", iconBg: "bg-blue-100", iconColor: "text-blue-600", badgeBg: "bg-blue-600" },
          { key: "DP", label: "Dairy Products", count: dpCount, Icon: Package, ringColor: "ring-amber-300", iconBg: "bg-amber-100", iconColor: "text-amber-600", badgeBg: "bg-amber-600" },
          { key: "IC", label: "Ice Cream", count: icCount, Icon: IceCream, ringColor: "ring-pink-300", iconBg: "bg-pink-100", iconColor: "text-pink-600", badgeBg: "bg-pink-600" },
        ].map(({ key, label, count, Icon, ringColor, iconBg, iconColor, badgeBg }) => (
          <Card
            key={key}
            className={`cursor-pointer hover:ring-2 ${ringColor}`}
            onClick={() => setFilterSegment(filterSegment === key ? "all" : key)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full ${iconBg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
              {filterSegment === key && <Badge className={`ml-auto ${badgeBg}`}>Active Filter</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Staff Accounts ({filtered.length})</span>
            {filterSegment !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setFilterSegment("all")}>
                Show All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No segment staff found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Assigned Segments</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((staff) => {
                    const role = getTeamLabel(staff.designationId);
                    const segments = staff.assignedSegments || [];
                    return (
                      <TableRow key={staff.id}>
                        <TableCell className="font-mono text-sm">{staff.employeeId}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{staff.name}</p>
                            <p className="text-xs text-muted-foreground">{staff.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{role}</Badge>
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
                            {segments.length === 3 && (
                              <Badge className="bg-green-100 text-green-800 ml-1" variant="secondary">All</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(staff.permissions || []).slice(0, 3).map((p) => (
                              <Badge key={p} variant="secondary" className="text-[10px] px-1 py-0">
                                {p.replace("workflow_", "")}
                              </Badge>
                            ))}
                            {(staff.permissions || []).length > 3 && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                +{(staff.permissions || []).length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {staff.isActive ? (
                            <Badge className="bg-green-100 text-green-800" variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" /> Active
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800" variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" /> Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditStaff(staff)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
                              onClick={() => {
                                if (confirm(`Delete ${staff.name}?`)) deleteMutation.mutate(staff.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      <CreateStaffDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {editStaff && (
        <EditStaffDialog
          staff={editStaff}
          open={!!editStaff}
          onClose={() => setEditStaff(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editStaff.id, ...data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
    </AdminLayout>
  );
}

function CreateStaffDialog({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [unionId, setUnionId] = useState("");

  const isWorkflow = isSegmentWorkflowDesignation(designationId);
  const isAllAccess = designationId.startsWith('agm_') || designationId === 'transport_manager';
  const effectiveSegments = isAllAccess ? ['FM', 'DP', 'IC'] : selectedSegments;
  const autoPerms = isWorkflow ? buildWorkflowPermissions(designationId, effectiveSegments) : [];

  const handleDesignationChange = (val: string) => {
    setDesignationId(val);
    if (val.startsWith('agm_') || val === 'transport_manager') {
      setSelectedSegments(['FM', 'DP', 'IC']);
    } else {
      setSelectedSegments([]);
    }
  };

  const toggleSegment = (segId: string) => {
    setSelectedSegments(prev =>
      prev.includes(segId) ? prev.filter(s => s !== segId) : [...prev, segId]
    );
  };

  const handleSubmit = () => {
    if (!unionId) {
      alert("Please select a union before adding staff.");
      return;
    }
    onSubmit({
      name,
      phone,
      email,
      employeeId,
      designationId,
      assignedSegments: effectiveSegments,
      unionId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add Segment Staff
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff name" />
            </div>
            <div>
              <Label>Employee ID *</Label>
              <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g. WF-MGR-002" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9XXXXXXXXX" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="optional" />
            </div>
          </div>

          <div>
            <Label>Union / District *</Label>
            <Select value={unionId} onValueChange={setUnionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select union" />
              </SelectTrigger>
              <SelectContent>
                {DISTRICT_UNIONS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Designation *</Label>
            <Select value={designationId} onValueChange={handleDesignationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {ALL_WORKFLOW_DESIGNATIONS.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isWorkflow && (
            <div>
              <Label className="mb-2 block">Assign Segments *</Label>
              <div className="flex gap-4">
                {SEGMENT_OPTIONS.map((seg) => {
                  const checked = effectiveSegments.includes(seg.id);
                  const meta = SEGMENT_META[seg.id];
                  const SegIcon = meta?.icon || Package;
                  return (
                    <label key={seg.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isAllAccess}
                        onChange={() => toggleSegment(seg.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <SegIcon className="h-4 w-4" />
                      <span className="text-sm">{seg.label}</span>
                    </label>
                  );
                })}
              </div>
              {isAllAccess && (
                <p className="text-xs text-muted-foreground mt-1">Managers automatically have access to all segments</p>
              )}
            </div>
          )}

          {autoPerms.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Auto-assigned permissions</Label>
              <div className="flex flex-wrap gap-1">
                {autoPerms.map(p => (
                  <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                    {p.replace("workflow_", "")}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name || !phone || !employeeId || !designationId || (isWorkflow && effectiveSegments.length === 0)}
          >
            {isPending ? "Creating..." : "Create Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditStaffDialog({
  staff,
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  staff: StaffMember;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(staff.name);
  const [phone, setPhone] = useState(staff.phone);
  const [email, setEmail] = useState(staff.email || "");
  const [isActive, setIsActive] = useState(staff.isActive);
  const [designationId, setDesignationId] = useState(staff.designationId);
  const [selectedSegments, setSelectedSegments] = useState<string[]>(staff.assignedSegments || []);

  const isWorkflow = isSegmentWorkflowDesignation(designationId);
  const isAllAccess = designationId.startsWith('agm_') || designationId === 'transport_manager';
  const effectiveSegments = isAllAccess ? ['FM', 'DP', 'IC'] : selectedSegments;
  const autoPerms = isWorkflow ? buildWorkflowPermissions(designationId, effectiveSegments) : [];

  const handleDesignationChange = (val: string) => {
    setDesignationId(val);
    if (val.startsWith('agm_') || val === 'transport_manager') {
      setSelectedSegments(['FM', 'DP', 'IC']);
    }
  };

  const toggleSegment = (segId: string) => {
    setSelectedSegments(prev =>
      prev.includes(segId) ? prev.filter(s => s !== segId) : [...prev, segId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" /> Edit Staff — {staff.employeeId}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <Label>Designation</Label>
            <Select value={designationId} onValueChange={handleDesignationChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_WORKFLOW_DESIGNATIONS.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isWorkflow && (
            <div>
              <Label className="mb-2 block">Assign Segments *</Label>
              <div className="flex gap-4">
                {SEGMENT_OPTIONS.map((seg) => {
                  const checked = effectiveSegments.includes(seg.id);
                  const meta = SEGMENT_META[seg.id];
                  const SegIcon = meta?.icon || Package;
                  return (
                    <label key={seg.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isAllAccess}
                        onChange={() => toggleSegment(seg.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <SegIcon className="h-4 w-4" />
                      <span className="text-sm">{seg.label}</span>
                    </label>
                  );
                })}
              </div>
              {isAllAccess && (
                <p className="text-xs text-muted-foreground mt-1">Managers automatically have access to all segments</p>
              )}
            </div>
          )}

          {autoPerms.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Auto-assigned permissions</Label>
              <div className="flex flex-wrap gap-1">
                {autoPerms.map(p => (
                  <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                    {p.replace("workflow_", "")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Label>Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSubmit({
              name,
              phone,
              email,
              designationId,
              assignedSegments: effectiveSegments,
              isActive,
            })}
            disabled={isPending || (isWorkflow && effectiveSegments.length === 0)}
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
