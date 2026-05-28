import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatTimestamp } from "@/lib/format-timestamp";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  ClipboardList,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Package,
  Loader2,
} from "lucide-react";

interface GrnItem {
  productName: string;
  expectedQty: number;
  receivedQty: number;
  damagedQty: number;
}

interface Grn {
  id: string;
  grnNumber: string;
  merchantId: string;
  supplierName: string;
  items: GrnItem[];
  remarks?: string;
  status: string;
  approvedBy?: string;
  receivedDate: string;
  createdAt: string;
}

export default function DmsGrn({ skipLayout }: { skipLayout?: boolean }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: adminAuth } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [detailGrn, setDetailGrn] = useState<Grn | null>(null);
  const [actionGrn, setActionGrn] = useState<{ grn: Grn; action: "approved" | "rejected" } | null>(null);
  const [actionNotes, setActionNotes] = useState("");

  const [supplierName, setSupplierName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [items, setItems] = useState<GrnItem[]>([
    { productName: "", expectedQty: 0, receivedQty: 0, damagedQty: 0 },
  ]);

  const merchantId = adminAuth?.user?.merchantId || adminAuth?.user?.id || user?.unionId || user?.id || "";

  const { data: grns = [], isLoading, refetch } = useQuery<Grn[]>({
    queryKey: ["/api/grn", merchantId],
    enabled: !!merchantId,
  });

  const createMutation = useMutation({
    mutationFn: async (body: { merchantId: string; supplierName: string; items: GrnItem[]; remarks: string }) => {
      return apiRequest("POST", "/api/grn", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grn", merchantId] });
      toast({ title: "Success", description: "GRN created successfully" });
      resetCreateForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create GRN", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, approvedBy }: { id: string; status: string; approvedBy: string }) => {
      return apiRequest("PATCH", `/api/grn/${id}/status`, { status, approvedBy });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grn", merchantId] });
      toast({ title: "Success", description: "GRN status updated successfully" });
      setActionGrn(null);
      setActionNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const resetCreateForm = () => {
    setCreateOpen(false);
    setSupplierName("");
    setRemarks("");
    setItems([{ productName: "", expectedQty: 0, receivedQty: 0, damagedQty: 0 }]);
  };

  const addItem = () => {
    setItems([...items, { productName: "", expectedQty: 0, receivedQty: 0, damagedQty: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof GrnItem, value: string | number) => {
    const updated = [...items];
    if (field === "productName") {
      updated[index][field] = value as string;
    } else {
      updated[index][field] = Number(value) || 0;
    }
    setItems(updated);
  };

  const handleCreate = () => {
    if (!supplierName.trim()) {
      toast({ title: "Validation Error", description: "Supplier name is required", variant: "destructive" });
      return;
    }
    const validItems = items.filter((i) => i.productName.trim());
    if (validItems.length === 0) {
      toast({ title: "Validation Error", description: "At least one item with a product name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate({ merchantId, supplierName, items: validItems, remarks });
  };

  const handleStatusUpdate = () => {
    if (!actionGrn) return;
    statusMutation.mutate({
      id: actionGrn.grn.id,
      status: actionGrn.action,
      approvedBy: `${user?.name || "Admin"}${actionNotes ? ` - ${actionNotes}` : ""}`,
    });
  };

  const hasDiscrepancy = (item: GrnItem) => item.receivedQty !== item.expectedQty || item.damagedQty > 0;

  const grnHasDiscrepancy = (grn: Grn) => {
    const grnItems: GrnItem[] = typeof grn.items === "string" ? JSON.parse(grn.items) : grn.items;
    return grnItems.some(hasDiscrepancy);
  };

  const totalGrns = grns.length;
  const pendingCount = grns.filter((g) => g.status === "pending").length;
  const approvedCount = grns.filter((g) => g.status === "approved").length;
  const discrepancyCount = grns.filter(grnHasDiscrepancy).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getGrnTotals = (grn: Grn) => {
    const grnItems: GrnItem[] = typeof grn.items === "string" ? JSON.parse(grn.items) : grn.items;
    return {
      expected: grnItems.reduce((s, i) => s + i.expectedQty, 0),
      received: grnItems.reduce((s, i) => s + i.receivedQty, 0),
      damaged: grnItems.reduce((s, i) => s + i.damagedQty, 0),
    };
  };

  const Wrapper = skipLayout ? ({ children }: { children: React.ReactNode }) => <>{children}</> : AdminLayout;

  if (!adminAuth && !user) {
    return (
      <Wrapper>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">GRN Management</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Goods Receipt Note - DMS</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create GRN</span>
          </Button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-[10px] sm:text-xs md:text-sm">Total GRNs</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold">{totalGrns}</p>
                </div>
                <ClipboardList className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-[10px] sm:text-xs md:text-sm">Pending Approval</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold">{pendingCount}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-[10px] sm:text-xs md:text-sm">Approved</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold">{approvedCount}</p>
                </div>
                <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-[10px] sm:text-xs md:text-sm">With Discrepancies</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold">{discrepancyCount}</p>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p>Loading GRN data...</p>
            </CardContent>
          </Card>
        ) : grns.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No GRN Records</h3>
              <p className="text-muted-foreground mb-4">Create your first Goods Receipt Note to start tracking incoming goods.</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create GRN
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                GRN Records
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GRN No</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Received Date</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Damaged</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grns.map((grn) => {
                      const totals = getGrnTotals(grn);
                      const hasDisc = grnHasDiscrepancy(grn);
                      return (
                        <TableRow
                          key={grn.id}
                          className={`cursor-pointer hover:bg-gray-50 ${hasDisc ? "bg-red-50/50" : ""}`}
                          onClick={() => setDetailGrn(grn)}
                        >
                          <TableCell className="font-medium">{grn.grnNumber || grn.id.slice(0, 8)}</TableCell>
                          <TableCell>{grn.supplierName}</TableCell>
                          <TableCell>
                            {grn.receivedDate ? formatTimestamp(grn.receivedDate) : formatTimestamp(grn.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">{totals.expected}</TableCell>
                          <TableCell className={`text-right ${totals.received !== totals.expected ? "text-red-600 font-semibold" : ""}`}>
                            {totals.received}
                          </TableCell>
                          <TableCell className={`text-right ${totals.damaged > 0 ? "text-red-600 font-semibold" : ""}`}>
                            {totals.damaged}
                          </TableCell>
                          <TableCell>{getStatusBadge(grn.status)}</TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setDetailGrn(grn)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {grn.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-green-600 hover:text-green-700"
                                    onClick={() => setActionGrn({ grn, action: "approved" })}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => setActionGrn({ grn, action: "rejected" })}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-2 p-3">
                {grns.map((grn) => {
                  const totals = getGrnTotals(grn);
                  const grnItems: GrnItem[] = typeof grn.items === "string" ? JSON.parse(grn.items) : grn.items;
                  return (
                    <Card key={grn.id} className="border shadow-sm cursor-pointer" onClick={() => setDetailGrn(grn)}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm font-mono">{grn.grnNumber || grn.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground truncate">{grn.supplierName}</p>
                          </div>
                          <div className="ml-2 shrink-0">
                            {getStatusBadge(grn.status)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{grn.receivedDate ? formatTimestamp(grn.receivedDate) : formatTimestamp(grn.createdAt)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Items:</span>
                            <span className="font-medium">{grnItems.length}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Exp: {totals.expected} | Rcvd: {totals.received}</span>
                          {grn.status === "pending" && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={() => setActionGrn({ grn, action: "approved" })}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" onClick={() => setActionGrn({ grn, action: "rejected" })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => !open && resetCreateForm()}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New GRN</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="supplierName">Supplier Name *</Label>
              <Input
                id="supplierName"
                placeholder="Enter supplier name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      {items.length > 1 && (
                        <Button size="sm" variant="ghost" className="text-red-500 h-6 w-6 p-0" onClick={() => removeItem(index)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Product Name"
                      value={item.productName}
                      onChange={(e) => updateItem(index, "productName", e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Expected Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.expectedQty}
                          onChange={(e) => updateItem(index, "expectedQty", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Received Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.receivedQty}
                          onChange={(e) => updateItem(index, "receivedQty", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Damaged Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.damagedQty}
                          onChange={(e) => updateItem(index, "damagedQty", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Additional notes (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCreateForm}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create GRN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailGrn} onOpenChange={(open) => !open && setDetailGrn(null)}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              GRN Details - {detailGrn?.grnNumber || detailGrn?.id.slice(0, 8)}
              {detailGrn && getStatusBadge(detailGrn.status)}
            </DialogTitle>
          </DialogHeader>
          {detailGrn && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Supplier</Label>
                  <p className="font-medium">{detailGrn.supplierName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Received Date</Label>
                  <p className="font-medium">
                    {detailGrn.receivedDate ? formatTimestamp(detailGrn.receivedDate) : formatTimestamp(detailGrn.createdAt)}
                  </p>
                </div>
                {detailGrn.approvedBy && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Approved/Rejected By</Label>
                    <p className="font-medium">{detailGrn.approvedBy}</p>
                  </div>
                )}
                {detailGrn.remarks && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Remarks</Label>
                    <p className="font-medium">{detailGrn.remarks}</p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-sm font-semibold">Items</Label>
                <div className="mt-2 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Damaged</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(typeof detailGrn.items === "string" ? JSON.parse(detailGrn.items) : detailGrn.items).map(
                        (item: GrnItem, index: number) => {
                          const disc = hasDiscrepancy(item);
                          return (
                            <TableRow key={index} className={disc ? "bg-red-50" : ""}>
                              <TableCell className="font-medium">{item.productName}</TableCell>
                              <TableCell className="text-right">{item.expectedQty}</TableCell>
                              <TableCell className={`text-right ${item.receivedQty !== item.expectedQty ? "text-red-600 font-semibold" : ""}`}>
                                {item.receivedQty}
                              </TableCell>
                              <TableCell className={`text-right ${item.damagedQty > 0 ? "text-red-600 font-semibold" : ""}`}>
                                {item.damagedQty}
                              </TableCell>
                              <TableCell className="text-center">
                                {disc ? (
                                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Discrepancy
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {detailGrn.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setDetailGrn(null);
                      setActionGrn({ grn: detailGrn, action: "approved" });
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => {
                      setDetailGrn(null);
                      setActionGrn({ grn: detailGrn, action: "rejected" });
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionGrn} onOpenChange={(open) => { if (!open) { setActionGrn(null); setActionNotes(""); } }}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>
              {actionGrn?.action === "approved" ? "Approve" : "Reject"} GRN - {actionGrn?.grn.grnNumber || actionGrn?.grn.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to {actionGrn?.action === "approved" ? "approve" : "reject"} this GRN from{" "}
              <strong>{actionGrn?.grn.supplierName}</strong>?
            </p>
            <div>
              <Label htmlFor="actionNotes">Notes (optional)</Label>
              <Textarea
                id="actionNotes"
                placeholder="Add any notes..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionGrn(null); setActionNotes(""); }}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={statusMutation.isPending}
              className={actionGrn?.action === "approved" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={actionGrn?.action === "rejected" ? "destructive" : "default"}
            >
              {statusMutation.isPending
                ? "Processing..."
                : actionGrn?.action === "approved"
                  ? "Approve GRN"
                  : "Reject GRN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Wrapper>
  );
}
