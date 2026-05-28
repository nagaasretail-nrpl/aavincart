import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Milk, Clock, CheckCircle2, XCircle, Package, Loader2, Settings, Pencil, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:   { label: "Pending",   variant: "secondary" },
  approved:  { label: "Approved",  variant: "default" },
  rejected:  { label: "Rejected",  variant: "destructive" },
  fulfilled: { label: "Fulfilled", variant: "outline" },
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Agent = { id: string; agentCode: string; agentName: string; pointName: string; routeName: string };
type FreeMilkReq = {
  id: string; employeeId: string; employeeName: string; unionId: string;
  quantityLiters: string; status: string; assignedAgentId: string | null;
  deliveryType: string; notes: string | null; adminNotes: string | null;
  createdAt: string; updatedAt: string; assignedAgent?: Agent | null;
};
type StaffEntitlement = {
  employeeId: string; employeeName: string; usedLiters: number;
  entitlementLiters: number; remainingLiters: number; hasOverride: boolean;
};

function ApproveDialog({ request, agents, onClose, onApproved }: {
  request: FreeMilkReq; agents: Agent[]; onClose: () => void; onApproved: () => void;
}) {
  const { toast } = useToast();
  const [assignedAgentId, setAssignedAgentId] = useState<string>(request.assignedAgentId || "");
  const [deliveryType, setDeliveryType] = useState(request.deliveryType || "route");
  const [adminNotes, setAdminNotes] = useState(request.adminNotes || "");

  const approveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/free-milk/requests/${request.id}/approve`, {
      assignedAgentId: assignedAgentId || undefined,
      deliveryType,
      adminNotes: adminNotes.trim() || undefined,
    }),
    onSuccess: () => {
      toast({ title: "Request approved" });
      onApproved();
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Free Milk Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{request.employeeName}</span></p>
            <p><span className="text-muted-foreground">Quantity:</span> <span className="font-medium">{parseFloat(request.quantityLiters).toFixed(1)} L</span></p>
          </div>

          <div className="space-y-1.5">
            <Label>Delivery Type</Label>
            <Select value={deliveryType} onValueChange={setDeliveryType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="route">Route Delivery</SelectItem>
                <SelectItem value="pickup">Walk-in Pickup</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {deliveryType === "route" && (
            <div className="space-y-1.5">
              <Label>Assign to Agent/Booth</Label>
              <Select value={assignedAgentId} onValueChange={setAssignedAgentId}>
                <SelectTrigger><SelectValue placeholder="Select agent…" /></SelectTrigger>
                <SelectContent>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.agentCode} — {a.agentName} ({a.routeName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Assign to a booth agent so it appears in the route dispatch report.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Admin Notes (optional)</Label>
            <Textarea
              placeholder="Collection point, timing, or other instructions…"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ request, onClose, onRejected }: {
  request: FreeMilkReq; onClose: () => void; onRejected: () => void;
}) {
  const { toast } = useToast();
  const [adminNotes, setAdminNotes] = useState("");

  const rejectMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/free-milk/requests/${request.id}/reject`, {
      adminNotes: adminNotes.trim() || undefined,
    }),
    onSuccess: () => {
      toast({ title: "Request rejected" });
      onRejected();
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Free Milk Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Employee:</span> <span className="font-medium">{request.employeeName}</span></p>
            <p><span className="text-muted-foreground">Quantity:</span> <span className="font-medium">{parseFloat(request.quantityLiters).toFixed(1)} L</span></p>
          </div>
          <div className="space-y-1.5">
            <Label>Reason for Rejection (optional)</Label>
            <Textarea
              placeholder="Reason for rejection…"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}>
            {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EntitlementOverrideDialog({ employee, unionDefault, onClose, onSaved }: {
  employee: StaffEntitlement; unionDefault: number; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(
    employee.hasOverride ? String(employee.entitlementLiters) : ""
  );

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/free-milk/staff/${employee.employeeId}/entitlement`, {
      entitlementLiters: value === "" ? null : parseFloat(value),
    }),
    onSuccess: () => {
      toast({ title: "Entitlement updated" });
      onSaved();
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Override Entitlement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Employee: <span className="font-medium text-foreground">{employee.employeeName}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Union default is <strong>{unionDefault.toFixed(1)} L/month</strong>. Leave blank to use the union default.
          </p>
          <div className="space-y-1.5">
            <Label>Custom Entitlement (Liters/month)</Label>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder={`Default: ${unionDefault.toFixed(1)}`}
              value={value}
              onChange={e => setValue(e.target.value)}
            />
          </div>
          {value !== "" && (
            <button
              className="text-xs text-muted-foreground underline"
              onClick={() => setValue("")}
            >
              Clear override — use union default ({unionDefault.toFixed(1)} L)
            </button>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnionEntitlementSettings({ merchantId }: { merchantId: string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const { data, isLoading } = useQuery<{ entitlementLiters: number }>({
    queryKey: ["/api/free-milk/union-entitlement", merchantId],
    queryFn: async () => {
      const res = await fetch("/api/free-milk/union-entitlement", { credentials: "include" });
      return res.json();
    },
    enabled: !!merchantId,
  });

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/free-milk/union-entitlement", {
      entitlementLiters: parseFloat(draft),
    }),
    onSuccess: () => {
      toast({ title: "Union default updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/free-milk/union-entitlement"] });
      queryClient.invalidateQueries({ queryKey: ["/api/free-milk/staff-entitlements"] });
      setEditing(false);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const currentVal = data?.entitlementLiters ?? 10;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="h-4 w-4 text-muted-foreground" />
          Union Default Entitlement
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="w-32"
              autoFocus
            />
            <span className="text-sm text-muted-foreground">L/month</span>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!draft || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{currentVal.toFixed(1)} L</span>
            <span className="text-sm text-muted-foreground">per employee per month</span>
            <Button size="sm" variant="outline" onClick={() => { setDraft(String(currentVal)); setEditing(true); }}>
              <Pencil className="h-3.5 w-3.5 mr-1" />Edit
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          This applies to all employees unless individually overridden.
        </p>
      </CardContent>
    </Card>
  );
}

function StaffEntitlementTable({ merchantId }: { merchantId: string }) {
  const [overrideTarget, setOverrideTarget] = useState<StaffEntitlement | null>(null);

  const { data, isLoading } = useQuery<{ unionDefault: number; result: StaffEntitlement[] }>({
    queryKey: ["/api/free-milk/staff-entitlements", merchantId],
    queryFn: async () => {
      const res = await fetch("/api/free-milk/staff-entitlements", { credentials: "include" });
      return res.json();
    },
    enabled: !!merchantId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/free-milk/staff-entitlements"] });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Loading usage data…
        </CardContent>
      </Card>
    );
  }

  if (!data || data.result.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          No employee requests this month.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">This Month's Usage by Employee</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Entitlement</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="w-40">Usage</TableHead>
                  <TableHead className="text-right">Override</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.result.map(e => {
                  const pct = e.entitlementLiters > 0
                    ? Math.min(100, (e.usedLiters / e.entitlementLiters) * 100)
                    : 100;
                  return (
                    <TableRow key={e.employeeId}>
                      <TableCell>
                        <p className="font-medium text-sm">{e.employeeName}</p>
                        {e.hasOverride && (
                          <span className="text-xs text-blue-600 font-medium">Custom limit</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {e.entitlementLiters.toFixed(1)} L
                      </TableCell>
                      <TableCell className="text-right text-amber-700">
                        {e.usedLiters.toFixed(1)} L
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${e.remainingLiters <= 0 ? "text-red-600" : "text-green-700"}`}>
                        {e.remainingLiters.toFixed(1)} L
                      </TableCell>
                      <TableCell>
                        <Progress value={pct} className="h-2 w-28" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setOverrideTarget(e)}
                          title={e.hasOverride ? "Edit override" : "Set custom limit"}
                        >
                          {e.hasOverride ? (
                            <><Pencil className="h-3.5 w-3.5 mr-1" />Edit</>
                          ) : (
                            <><Pencil className="h-3.5 w-3.5 mr-1" />Override</>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {overrideTarget && (
        <EntitlementOverrideDialog
          employee={overrideTarget}
          unionDefault={data.unionDefault}
          onClose={() => setOverrideTarget(null)}
          onSaved={refresh}
        />
      )}
    </>
  );
}

function FreeMilkRequestsContent() {
  const { merchantId } = useMerchantContext();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [approveTarget, setApproveTarget] = useState<FreeMilkReq | null>(null);
  const [rejectTarget, setRejectTarget] = useState<FreeMilkReq | null>(null);
  const [activeTab, setActiveTab] = useState<"requests" | "entitlements">("requests");

  const { data: requests = [], isLoading } = useQuery<FreeMilkReq[]>({
    queryKey: ["/api/free-milk/requests", merchantId, statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/free-milk/requests?status=${statusFilter}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!merchantId,
  });

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/free-milk/agents", merchantId],
    queryFn: async () => {
      const res = await fetch("/api/free-milk/agents", { credentials: "include" });
      return res.json();
    },
    enabled: !!merchantId,
  });

  const fulfillMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/free-milk/requests/${id}/fulfill`, {}),
    onSuccess: () => {
      toast({ title: "Marked as fulfilled" });
      queryClient.invalidateQueries({ queryKey: ["/api/free-milk/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/free-milk/staff-entitlements"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/free-milk/requests"] });

  const { data: allRequests = [] } = useQuery<FreeMilkReq[]>({
    queryKey: ["/api/free-milk/requests", merchantId, "all"],
    queryFn: async () => {
      const res = await fetch(`/api/free-milk/requests?status=all`, { credentials: "include" });
      return res.json();
    },
    enabled: !!merchantId,
    staleTime: 30000,
  });

  const pendingCount = allRequests.filter(r => r.status === "pending").length;
  const approvedCount = allRequests.filter(r => r.status === "approved").length;
  const totalApprovedLitres = allRequests
    .filter(r => r.status === "approved" || r.status === "fulfilled")
    .reduce((s, r) => s + parseFloat(r.quantityLiters || "0"), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-green-50 p-2">
            <Milk className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Free Milk Requests</h1>
            <p className="text-sm text-muted-foreground">Manage employee free milk entitlement requests</p>
          </div>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className={pendingCount > 0 ? "border-amber-200 bg-amber-50 dark:bg-amber-950" : ""}>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className={`h-8 w-8 ${pendingCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
            <div>
              <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-amber-700" : "text-foreground"}`}>{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Awaiting Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved (Pending Dispatch)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50 dark:bg-teal-950">
          <CardContent className="p-4 flex items-center gap-3">
            <Milk className="h-8 w-8 text-teal-500" />
            <div>
              <p className="text-2xl font-bold text-teal-700">{totalApprovedLitres.toFixed(1)} L</p>
              <p className="text-xs text-muted-foreground">Total Approved + Fulfilled</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "requests" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("requests")}
        >
          Requests
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === "entitlements" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("entitlements")}
        >
          Entitlement Settings
        </button>
      </div>

      {activeTab === "requests" && (
        <>
          <div className="flex items-center justify-end">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Loading requests…
                </div>
              ) : requests.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No {statusFilter === "all" ? "" : statusFilter} requests found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Assigned Booth</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map(r => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <p className="font-medium text-foreground">{r.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{r.employeeId.slice(0, 8)}…</p>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {parseFloat(r.quantityLiters).toFixed(1)} L
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">{r.deliveryType === "pickup" ? "Walk-in Pickup" : "Route Delivery"}</span>
                          </TableCell>
                          <TableCell>
                            {r.assignedAgent ? (
                              <div>
                                <p className="text-xs font-medium">{r.assignedAgent.agentCode} — {r.assignedAgent.agentName}</p>
                                <p className="text-xs text-muted-foreground">{r.assignedAgent.routeName}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_CONFIG[r.status]?.variant || "outline"}>
                              {STATUS_CONFIG[r.status]?.label || r.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">{formatDate(r.createdAt)}</span>
                          </TableCell>
                          <TableCell className="max-w-[160px]">
                            {r.notes && <p className="text-xs text-muted-foreground truncate">{r.notes}</p>}
                            {r.adminNotes && <p className="text-xs text-blue-600 truncate">{r.adminNotes}</p>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {r.status === "pending" && (
                                <>
                                  <Button size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50"
                                    onClick={() => setApproveTarget(r)}>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50"
                                    onClick={() => setRejectTarget(r)}>
                                    <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                                  </Button>
                                </>
                              )}
                              {r.status === "approved" && (
                                <Button size="sm" variant="outline"
                                  onClick={() => fulfillMutation.mutate(r.id)}
                                  disabled={fulfillMutation.isPending}>
                                  <Package className="h-3.5 w-3.5 mr-1" />Mark Fulfilled
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "entitlements" && merchantId && (
        <div className="space-y-5">
          <UnionEntitlementSettings merchantId={merchantId} />
          <Separator />
          <div>
            <h2 className="text-sm font-semibold mb-3">Per-Employee Usage &amp; Overrides (This Month)</h2>
            <StaffEntitlementTable merchantId={merchantId} />
          </div>
        </div>
      )}

      {approveTarget && (
        <ApproveDialog
          request={approveTarget}
          agents={agents}
          onClose={() => setApproveTarget(null)}
          onApproved={refresh}
        />
      )}
      {rejectTarget && (
        <RejectDialog
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={refresh}
        />
      )}
    </div>
  );
}

export default function FreeMilkRequestsPage() {
  return (
    <MerchantLayout>
      <FreeMilkRequestsContent />
    </MerchantLayout>
  );
}
