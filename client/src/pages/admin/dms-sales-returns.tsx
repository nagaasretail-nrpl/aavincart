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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  RotateCcw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Search,
  FileText,
  CreditCard,
  Ban,
  Truck,
  Package,
} from "lucide-react";

interface ReturnItem {
  productName: string;
  quantity: number;
  price: number;
  reason: string;
}

interface SalesReturn {
  id: string;
  returnNumber: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  items: ReturnItem[];
  returnType: string;
  returnReason: string;
  totalAmount: number;
  creditNoteNumber?: string;
  status: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  gstAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  reverseLogisticsJobId?: string;
}

export default function DmsSalesReturns({ skipLayout }: { skipLayout?: boolean }) {
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
  const [detailReturn, setDetailReturn] = useState<SalesReturn | null>(null);
  const [creditNoteView, setCreditNoteView] = useState<SalesReturn | null>(null);
  const [actionReturn, setActionReturn] = useState<{ sr: SalesReturn; action: "approved" | "rejected" } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderId, setOrderId] = useState("");
  const [returnType, setReturnType] = useState("with_invoice");
  const [returnReason, setReturnReason] = useState("");
  const [items, setItems] = useState<ReturnItem[]>([
    { productName: "", quantity: 1, price: 0, reason: "" },
  ]);

  const merchantId = adminAuth?.user?.merchantId || adminAuth?.user?.id || user?.unionId || user?.id || "";

  const { data: salesReturns = [], isLoading, refetch } = useQuery<SalesReturn[]>({
    queryKey: ["/api/sales-returns", merchantId],
    enabled: !!merchantId,
  });

  const createMutation = useMutation({
    mutationFn: async (body: {
      merchantId: string;
      customerId: string;
      customerName: string;
      orderId?: string;
      items: ReturnItem[];
      returnType: string;
      returnReason: string;
      totalAmount: number;
    }) => {
      return apiRequest("POST", "/api/sales-returns", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns", merchantId] });
      toast({ title: "Success", description: "Sales return created successfully" });
      resetCreateForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create sales return", variant: "destructive" });
    },
  });

  const pickupJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/sales-returns/${id}/create-pickup-job`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns", merchantId] });
      toast({ title: "Success", description: "Reverse logistics pickup job created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create pickup job", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, approvedBy, rejectionReason }: {
      id: string;
      status: string;
      approvedBy: string;
      rejectionReason?: string;
    }) => {
      return apiRequest("PATCH", `/api/sales-returns/${id}/status`, { status, approvedBy, rejectionReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-returns", merchantId] });
      toast({ title: "Success", description: "Status updated successfully" });
      setActionReturn(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const resetCreateForm = () => {
    setCreateOpen(false);
    setCustomerId("");
    setCustomerName("");
    setOrderId("");
    setReturnType("with_invoice");
    setReturnReason("");
    setItems([{ productName: "", quantity: 1, price: 0, reason: "" }]);
  };

  const addItem = () => {
    setItems([...items, { productName: "", quantity: 1, price: 0, reason: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: string | number) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const handleCreate = () => {
    if (!customerId.trim() || !customerName.trim()) {
      toast({ title: "Validation Error", description: "Customer ID and Name are required", variant: "destructive" });
      return;
    }
    if (items.some((item) => !item.productName.trim() || item.quantity <= 0 || item.price <= 0)) {
      toast({ title: "Validation Error", description: "All items must have a product name, quantity > 0, and price > 0", variant: "destructive" });
      return;
    }
    if (!returnReason.trim()) {
      toast({ title: "Validation Error", description: "Return reason is required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      merchantId,
      customerId: customerId.trim(),
      customerName: customerName.trim(),
      orderId: orderId.trim() || undefined,
      items,
      returnType,
      returnReason: returnReason.trim(),
      totalAmount,
    });
  };

  const handleStatusAction = () => {
    if (!actionReturn) return;
    if (actionReturn.action === "rejected" && !rejectionReason.trim()) {
      toast({ title: "Validation Error", description: "Rejection reason is required", variant: "destructive" });
      return;
    }
    statusMutation.mutate({
      id: actionReturn.sr.id,
      status: actionReturn.action,
      approvedBy: user?.name || user?.id || "admin",
      rejectionReason: actionReturn.action === "rejected" ? rejectionReason.trim() : undefined,
    });
  };

  const filteredReturns = salesReturns.filter((sr) => {
    const matchesStatus = statusFilter === "all" || sr.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      sr.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sr.returnNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalReturns = salesReturns.length;
  const pendingCount = salesReturns.filter((sr) => sr.status === "pending").length;
  const approvedReturns = salesReturns.filter((sr) => sr.status === "approved");
  const approvedCount = approvedReturns.length;
  const totalCreditAmount = approvedReturns.reduce((sum, sr) => sum + (sr.totalAmount || 0), 0);
  const rejectedCount = salesReturns.filter((sr) => sr.status === "rejected").length;

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

  const Wrapper = skipLayout ? ({ children }: { children: React.ReactNode }) => <>{children}</> : AdminLayout;

  return (
    <Wrapper>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-base sm:text-xl font-bold">Sales Returns & Credit Notes</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage returns and generate credit notes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Return</span>
          </Button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs md:text-sm">Total Returns</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold">{totalReturns}</p>
                </div>
                <RotateCcw className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-xs md:text-sm">Pending</p>
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
                  <p className="text-green-100 text-xs md:text-sm">Approved</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold">{approvedCount}</p>
                  <p className="text-green-100 text-xs">₹{totalCreditAmount.toFixed(2)}</p>
                </div>
                <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-xs md:text-sm">Rejected</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold">{rejectedCount}</p>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by customer name or return number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p>Loading sales returns...</p>
            </CardContent>
          </Card>
        ) : filteredReturns.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Sales Returns Found</h3>
              <p className="text-muted-foreground mb-4">
                {salesReturns.length === 0
                  ? "Create your first sales return to get started."
                  : "No returns match your current filters."}
              </p>
              {salesReturns.length === 0 && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Return
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Sales Returns ({filteredReturns.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Return No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="hidden lg:table-cell">Order ID</TableHead>
                      <TableHead className="hidden lg:table-cell">Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="hidden lg:table-cell">Credit Note</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.map((sr) => (
                      <TableRow key={sr.id}>
                        <TableCell className="font-mono text-sm">{sr.returnNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{sr.customerName}</p>
                            <p className="text-xs text-muted-foreground">{sr.customerId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {sr.orderId || "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {sr.items?.length || 0} item(s)
                        </TableCell>
                        <TableCell className="font-medium">₹{Number(sr.totalAmount).toFixed(2)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {sr.creditNoteNumber ? (
                            <button
                              onClick={() => setCreditNoteView(sr)}
                              className="text-blue-600 hover:underline font-mono text-sm"
                            >
                              {sr.creditNoteNumber}
                            </button>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(sr.status)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {sr.createdAt ? formatTimestamp(sr.createdAt) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDetailReturn(sr)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {sr.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => setActionReturn({ sr, action: "approved" })}
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => setActionReturn({ sr, action: "rejected" })}
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {sr.creditNoteNumber && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => setCreditNoteView(sr)}
                                title="View Credit Note"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                            {sr.status === "approved" && !sr.reverseLogisticsJobId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-orange-600 hover:text-orange-700"
                                onClick={() => pickupJobMutation.mutate(sr.id)}
                                disabled={pickupJobMutation.isPending}
                                title="Create Pickup Job"
                              >
                                <Truck className="h-4 w-4" />
                              </Button>
                            )}
                            {sr.reverseLogisticsJobId && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs ml-1">Pickup #{sr.reverseLogisticsJobId.slice(0,6)}</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-2 p-3">
                {filteredReturns.map((sr) => (
                  <Card key={sr.id} className="border shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">{sr.returnNumber}</p>
                          <p className="font-medium text-sm">{sr.customerName}</p>
                        </div>
                        {getStatusBadge(sr.status)}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground text-xs">{sr.createdAt ? formatTimestamp(sr.createdAt) : "-"}</span>
                        <span className="font-bold">₹{Number(sr.totalAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setDetailReturn(sr)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                        {sr.status === "pending" && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600" onClick={() => setActionReturn({ sr, action: "approved" })}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => setActionReturn({ sr, action: "rejected" })}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {sr.creditNoteNumber && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600" onClick={() => setCreditNoteView(sr)}>
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {sr.status === "approved" && !sr.reverseLogisticsJobId && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-600" onClick={() => pickupJobMutation.mutate(sr.id)} disabled={pickupJobMutation.isPending}>
                            <Truck className="h-3.5 w-3.5 mr-1" /> Pickup
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => !open && resetCreateForm()}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Sales Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerId">Customer ID *</Label>
                <Input
                  id="customerId"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Enter customer ID"
                />
              </div>
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderId">Order ID (Optional)</Label>
                <Input
                  id="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Reference order ID"
                />
              </div>
              <div>
                <Label htmlFor="returnType">Return Type *</Label>
                <Select value={returnType} onValueChange={setReturnType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="with_invoice">With Invoice</SelectItem>
                    <SelectItem value="without_invoice">Without Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="returnReason">Return Reason *</Label>
              <Textarea
                id="returnReason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Describe the reason for return"
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Return Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                      {items.length > 1 && (
                        <Button size="sm" variant="ghost" className="text-red-500 h-6 w-6 p-0" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input
                        placeholder="Product Name"
                        value={item.productName}
                        onChange={(e) => updateItem(index, "productName", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, "price", parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <Input
                      placeholder="Reason for returning this item"
                      value={item.reason}
                      onChange={(e) => updateItem(index, "reason", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
              <span className="font-medium">Total Amount</span>
              <span className="text-xl font-bold">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetCreateForm}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailReturn} onOpenChange={(open) => !open && setDetailReturn(null)}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Return Details - {detailReturn?.returnNumber}</DialogTitle>
          </DialogHeader>
          {detailReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{detailReturn.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer ID</p>
                  <p className="font-medium">{detailReturn.customerId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Order ID</p>
                  <p className="font-medium">{detailReturn.orderId || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Return Type</p>
                  <p className="font-medium capitalize">{detailReturn.returnType?.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(detailReturn.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{detailReturn.createdAt ? formatTimestamp(detailReturn.createdAt) : "-"}</p>
                </div>
                {detailReturn.creditNoteNumber && (
                  <div>
                    <p className="text-muted-foreground">Credit Note</p>
                    <p className="font-medium font-mono">{detailReturn.creditNoteNumber}</p>
                  </div>
                )}
                {detailReturn.approvedBy && (
                  <div>
                    <p className="text-muted-foreground">Approved By</p>
                    <p className="font-medium">{detailReturn.approvedBy}</p>
                  </div>
                )}
                {detailReturn.rejectionReason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Rejection Reason</p>
                    <p className="font-medium text-red-600">{detailReturn.rejectionReason}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-muted-foreground text-sm mb-1">Return Reason</p>
                <p className="text-sm bg-gray-50 rounded p-2">{detailReturn.returnReason}</p>
              </div>

              <div>
                <p className="font-medium mb-2">Items</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailReturn.items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{item.productName}</p>
                              {item.reason && <p className="text-xs text-muted-foreground">{item.reason}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">₹{Number(item.price).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">₹{(item.quantity * item.price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center mt-3 bg-gray-50 rounded p-3">
                  <span className="font-medium">Total Amount</span>
                  <span className="text-lg font-bold">₹{Number(detailReturn.totalAmount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionReturn} onOpenChange={(open) => { if (!open) { setActionReturn(null); setRejectionReason(""); } }}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>
              {actionReturn?.action === "approved" ? "Approve Return" : "Reject Return"} - {actionReturn?.sr.returnNumber}
            </DialogTitle>
          </DialogHeader>
          {actionReturn && (
            <div className="space-y-4">
              <div className="text-sm">
                <p><span className="text-muted-foreground">Customer:</span> {actionReturn.sr.customerName}</p>
                <p><span className="text-muted-foreground">Amount:</span> ₹{Number(actionReturn.sr.totalAmount).toFixed(2)}</p>
                <p><span className="text-muted-foreground">Items:</span> {actionReturn.sr.items?.length || 0}</p>
              </div>
              {actionReturn.action === "approved" ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                  <CheckCircle className="h-5 w-5 inline mr-2" />
                  Approving this return will automatically generate a credit note number.
                </div>
              ) : (
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejecting this return"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionReturn(null); setRejectionReason(""); }}>
              Cancel
            </Button>
            {actionReturn?.action === "approved" ? (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={handleStatusAction}
                disabled={statusMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {statusMutation.isPending ? "Approving..." : "Approve & Generate Credit Note"}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleStatusAction}
                disabled={statusMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {statusMutation.isPending ? "Rejecting..." : "Reject Return"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!creditNoteView} onOpenChange={(open) => !open && setCreditNoteView(null)}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Credit Note
            </DialogTitle>
          </DialogHeader>
          {creditNoteView && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 mb-1">Credit Note Number</p>
                <p className="text-2xl font-bold font-mono text-green-800">{creditNoteView.creditNoteNumber}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Return Number</p>
                  <p className="font-medium font-mono">{creditNoteView.returnNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{creditNoteView.createdAt ? formatTimestamp(creditNoteView.createdAt) : "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{creditNoteView.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Customer ID</p>
                  <p className="font-medium">{creditNoteView.customerId}</p>
                </div>
                {creditNoteView.orderId && (
                  <div>
                    <p className="text-muted-foreground">Order Reference</p>
                    <p className="font-medium">{creditNoteView.orderId}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Approved By</p>
                  <p className="font-medium">{creditNoteView.approvedBy || "-"}</p>
                </div>
              </div>

              <div>
                <p className="font-medium mb-2 text-sm">Credit Items</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditNoteView.items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{item.productName}</TableCell>
                          <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right text-sm">₹{Number(item.price).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">₹{(item.quantity * item.price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {(creditNoteView.gstAmount || creditNoteView.cgstAmount || creditNoteView.sgstAmount || creditNoteView.igstAmount) ? (
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="font-medium text-sm">GST Breakdown</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {creditNoteView.cgstAmount ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CGST</span>
                        <span className="font-medium">₹{Number(creditNoteView.cgstAmount).toFixed(2)}</span>
                      </div>
                    ) : null}
                    {creditNoteView.sgstAmount ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SGST</span>
                        <span className="font-medium">₹{Number(creditNoteView.sgstAmount).toFixed(2)}</span>
                      </div>
                    ) : null}
                    {creditNoteView.igstAmount ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IGST</span>
                        <span className="font-medium">₹{Number(creditNoteView.igstAmount).toFixed(2)}</span>
                      </div>
                    ) : null}
                    {creditNoteView.gstAmount ? (
                      <div className="flex justify-between col-span-2 pt-1 border-t">
                        <span className="text-muted-foreground font-medium">Total GST</span>
                        <span className="font-bold">₹{Number(creditNoteView.gstAmount).toFixed(2)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="bg-green-50 rounded-lg p-4 flex items-center justify-between">
                <span className="font-medium text-green-800">Total Credit Amount</span>
                <span className="text-xl font-bold text-green-800">₹{Number(creditNoteView.totalAmount).toFixed(2)}</span>
              </div>

              {creditNoteView.status === "approved" && !creditNoteView.reverseLogisticsJobId && (
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={() => {
                    pickupJobMutation.mutate(creditNoteView.id);
                    setCreditNoteView(null);
                  }}
                  disabled={pickupJobMutation.isPending}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  {pickupJobMutation.isPending ? "Creating..." : "Create Pickup Job (Reverse Logistics)"}
                </Button>
              )}
              {creditNoteView.reverseLogisticsJobId && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Pickup Job Created</p>
                    <p className="text-xs text-orange-600">Job ID: {creditNoteView.reverseLogisticsJobId}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </Wrapper>
  );
}
