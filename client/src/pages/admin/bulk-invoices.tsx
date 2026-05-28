import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Trash2, FileText, Truck, CheckCircle, XCircle, Send, Download,
  ChevronDown, Search, Building2, Filter, Eye, ArrowRight, Link2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CUSTOMER_TYPES = [
  { value: "corporate", label: "Corporate" },
  { value: "inter_union", label: "Inter-Union" },
  { value: "institution", label: "Institution" },
  { value: "government", label: "Government" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  dispatched: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

interface BulkInvoiceItem {
  productId?: string;
  name: string;
  hsnCode: string;
  quantity: number;
  caseQty: number;
  unitPrice: number;
  gstRate: number;
  segment: string;
  amount: number;
}

export default function BulkInvoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const merchantId = user?.unionId || user?.merchantId || user?.id || "";

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bulk-invoices", merchantId, filterStatus, filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterType !== "all") params.set("customerType", filterType);
      const res = await fetch(`/api/bulk-invoices/${merchantId}?${params}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filteredInvoices = invoices.filter((inv: any) =>
    !searchQuery ||
    inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/bulk-invoices/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-invoices", merchantId] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bulk-invoices/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-invoices", merchantId] });
      toast({ title: "Invoice deleted" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const ewayMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/bulk-invoices/${id}/generate-eway-bill`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-invoices", merchantId] });
      toast({ title: "E-way Bill Generated", description: `Bill No: ${data.ewayBillNumber}` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const paymentLinkMutation = useMutation({
    mutationFn: async (inv: any) => {
      const res = await apiRequest("POST", "/api/cashfree/payment-links", {
        amount: parseFloat(inv.totalAmount),
        purpose: `Payment for Bulk Invoice ${inv.invoiceNumber}`,
        customerName: inv.customerName,
        customerEmail: inv.customerEmail || "",
        customerPhone: inv.customerPhone || "",
        relatedInvoiceId: inv.invoiceNumber,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/payment-links"] });
      if (data.linkUrl) {
        navigator.clipboard.writeText(data.linkUrl);
        toast({ title: "Payment Link Created", description: "Link copied to clipboard" });
      } else {
        toast({ title: "Payment Link Created" });
      }
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const stats = {
    total: invoices.length,
    draft: invoices.filter((i: any) => i.status === "draft").length,
    confirmed: invoices.filter((i: any) => i.status === "confirmed").length,
    dispatched: invoices.filter((i: any) => i.status === "dispatched").length,
    delivered: invoices.filter((i: any) => i.status === "delivered").length,
    totalValue: invoices.filter((i: any) => i.status !== "cancelled").reduce((a: number, i: any) => a + parseFloat(i.totalAmount || 0), 0),
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage bulk invoices for corporates, unions, and institutions</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" /> New Bulk Invoice
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3"><div className="text-xs text-gray-500">Total</div><div className="text-xl font-bold">{stats.total}</div></Card>
        <Card className="p-3"><div className="text-xs text-gray-500">Draft</div><div className="text-xl font-bold text-gray-600">{stats.draft}</div></Card>
        <Card className="p-3"><div className="text-xs text-gray-500">Confirmed</div><div className="text-xl font-bold text-blue-600">{stats.confirmed}</div></Card>
        <Card className="p-3"><div className="text-xs text-gray-500">Dispatched</div><div className="text-xl font-bold text-orange-600">{stats.dispatched}</div></Card>
        <Card className="p-3"><div className="text-xs text-gray-500">Delivered</div><div className="text-xl font-bold text-green-600">{stats.delivered}</div></Card>
        <Card className="p-3"><div className="text-xs text-gray-500">Total Value</div><div className="text-xl font-bold">₹{stats.totalValue.toLocaleString("en-IN")}</div></Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Search by customer or invoice number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="dispatched">Dispatched</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CUSTOMER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>E-way Bill</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">No bulk invoices found</TableCell></TableRow>
              ) : filteredInvoices.map((inv: any) => (
                <TableRow key={inv.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setShowDetail(inv)}>
                  <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium">{inv.customerName}</div>
                    {inv.customerGstin && <div className="text-xs text-gray-500">GSTIN: {inv.customerGstin}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{CUSTOMER_TYPES.find(t => t.value === inv.customerType)?.label || inv.customerType}</Badge></TableCell>
                  <TableCell><Badge variant="secondary">{inv.productSegment}</Badge></TableCell>
                  <TableCell className="text-right font-medium">₹{parseFloat(inv.totalAmount).toLocaleString("en-IN")}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[inv.status]}>{inv.status}</Badge></TableCell>
                  <TableCell>{inv.ewayBillId ? <Badge variant="outline" className="text-green-600">{inv.ewayBillId.substring(0, 12)}</Badge> : <span className="text-gray-400">-</span>}</TableCell>
                  <TableCell className="text-sm text-gray-500">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN") : "-"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {inv.status === "draft" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: inv.id, status: "confirmed" })} title="Confirm"><CheckCircle className="h-4 w-4 text-blue-600" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(inv.id)} title="Delete"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </>
                      )}
                      {inv.status === "confirmed" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: inv.id, status: "dispatched" })} title="Mark Dispatched"><Truck className="h-4 w-4 text-orange-600" /></Button>
                          {!inv.ewayBillId && parseFloat(inv.totalAmount) >= 50000 && (
                            <Button size="sm" variant="ghost" onClick={() => ewayMutation.mutate(inv.id)} title="Generate E-way Bill"><FileText className="h-4 w-4 text-purple-600" /></Button>
                          )}
                        </>
                      )}
                      {inv.status === "dispatched" && (
                        <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: inv.id, status: "delivered" })} title="Mark Delivered"><CheckCircle className="h-4 w-4 text-green-600" /></Button>
                      )}
                      {(inv.status === "draft" || inv.status === "confirmed") && (
                        <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: inv.id, status: "cancelled" })} title="Cancel"><XCircle className="h-4 w-4 text-red-500" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading ? (
          <Card className="p-6 text-center">Loading...</Card>
        ) : filteredInvoices.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">No bulk invoices found</Card>
        ) : filteredInvoices.map((inv: any) => (
          <Card key={inv.id} className="p-4 cursor-pointer" onClick={() => setShowDetail(inv)}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-mono text-sm font-medium">{inv.invoiceNumber}</p>
                <p className="font-semibold">{inv.customerName}</p>
              </div>
              <Badge className={STATUS_COLORS[inv.status]}>{inv.status}</Badge>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{CUSTOMER_TYPES.find(t => t.value === inv.customerType)?.label}</span>
              <span className="font-bold text-gray-900 dark:text-white">₹{parseFloat(inv.totalAmount).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex gap-2 mt-3">
              {inv.status === "draft" && (
                <>
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: inv.id, status: "confirmed" }); }}>Confirm</Button>
                  <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(inv.id); }}>Delete</Button>
                </>
              )}
              {inv.status === "confirmed" && (
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: inv.id, status: "dispatched" }); }}>Dispatch</Button>
              )}
              {inv.status === "dispatched" && (
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: inv.id, status: "delivered" }); }}>Delivered</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {showCreate && <CreateBulkInvoiceDialog merchantId={merchantId} onClose={() => setShowCreate(false)} />}

      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice {showDetail.invoiceNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Customer</Label>
                  <p className="font-medium">{showDetail.customerName}</p>
                  {showDetail.customerGstin && <p className="text-sm text-gray-500">GSTIN: {showDetail.customerGstin}</p>}
                  {showDetail.customerPhone && <p className="text-sm text-gray-500">Phone: {showDetail.customerPhone}</p>}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Type</Label>
                  <p>{CUSTOMER_TYPES.find(t => t.value === showDetail.customerType)?.label}</p>
                  <Badge className={`mt-1 ${STATUS_COLORS[showDetail.status]}`}>{showDetail.status}</Badge>
                </div>
              </div>
              {showDetail.customerAddress && (
                <div><Label className="text-xs text-gray-500">Address</Label><p className="text-sm">{showDetail.customerAddress}</p></div>
              )}
              <div>
                <Label className="text-xs text-gray-500 mb-2 block">Line Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>HSN</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">GST %</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(showDetail.items) ? showDetail.items : []).map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name || item.productName}</TableCell>
                        <TableCell className="font-mono text-xs">{item.hsnCode}</TableCell>
                        <TableCell className="text-right">{item.quantity}{item.caseQty ? ` (${item.caseQty} cases)` : ""}</TableCell>
                        <TableCell className="text-right">₹{parseFloat(item.unitPrice).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right">{item.gstRate}%</TableCell>
                        <TableCell className="text-right font-medium">₹{parseFloat(item.amount || 0).toLocaleString("en-IN")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <div className="text-right space-y-1">
                  <p className="text-sm text-gray-500">Subtotal: ₹{parseFloat(showDetail.subtotal).toLocaleString("en-IN")}</p>
                  <p className="text-sm text-gray-500">GST: ₹{parseFloat(showDetail.gstAmount).toLocaleString("en-IN")}</p>
                  <p className="text-lg font-bold">Total: ₹{parseFloat(showDetail.totalAmount).toLocaleString("en-IN")}</p>
                </div>
              </div>
              {showDetail.ewayBillId && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">E-way Bill: {showDetail.ewayBillId}</p>
                </div>
              )}
              {showDetail.notes && (
                <div><Label className="text-xs text-gray-500">Notes</Label><p className="text-sm">{showDetail.notes}</p></div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {showDetail.status === "draft" && (
                  <Button onClick={() => { statusMutation.mutate({ id: showDetail.id, status: "confirmed" }); setShowDetail(null); }} className="bg-blue-600 hover:bg-blue-700">
                    <CheckCircle className="h-4 w-4 mr-2" /> Confirm Invoice
                  </Button>
                )}
                {showDetail.status === "confirmed" && (
                  <>
                    <Button onClick={() => { statusMutation.mutate({ id: showDetail.id, status: "dispatched" }); setShowDetail(null); }} className="bg-orange-600 hover:bg-orange-700">
                      <Truck className="h-4 w-4 mr-2" /> Mark Dispatched
                    </Button>
                    {!showDetail.ewayBillId && parseFloat(showDetail.totalAmount) >= 50000 && (
                      <Button variant="outline" onClick={() => { ewayMutation.mutate(showDetail.id); setShowDetail(null); }}>
                        <FileText className="h-4 w-4 mr-2" /> Generate E-way Bill
                      </Button>
                    )}
                  </>
                )}
                {showDetail.status === "dispatched" && (
                  <Button onClick={() => { statusMutation.mutate({ id: showDetail.id, status: "delivered" }); setShowDetail(null); }} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark Delivered
                  </Button>
                )}
                {(showDetail.status === "confirmed" || showDetail.status === "dispatched") && (
                  <Button variant="outline" onClick={() => paymentLinkMutation.mutate(showDetail)} disabled={paymentLinkMutation.isPending} className="border-purple-300 text-purple-700 hover:bg-purple-50">
                    <Link2 className="h-4 w-4 mr-2" /> {paymentLinkMutation.isPending ? "Creating..." : "Send Payment Link"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
    </AdminLayout>
  );
}

function CreateBulkInvoiceDialog({ merchantId, onClose }: { merchantId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [customerType, setCustomerType] = useState("corporate");
  const [customerName, setCustomerName] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryRequired, setDeliveryRequired] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<BulkInvoiceItem[]>([
    { productId: "", name: "", hsnCode: "0401", quantity: 1, caseQty: 0, unitPrice: 0, gstRate: 5, segment: "", amount: 0 },
  ]);

  const [productSearches, setProductSearches] = useState<Record<number, string>>({});
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const { data: catalogProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (openDropdown !== null) {
        const ref = dropdownRefs.current[openDropdown];
        if (ref && !ref.contains(e.target as Node)) {
          const searchText = productSearches[openDropdown];
          if (searchText && !items[openDropdown]?.name) {
            updateItem(openDropdown, "name", searchText);
          }
          setOpenDropdown(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown, productSearches, items]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/bulk-invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-invoices", merchantId] });
      toast({ title: "Bulk invoice created" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addItem = () => {
    setItems([...items, { productId: "", name: "", hsnCode: "0401", quantity: 1, caseQty: 0, unitPrice: 0, gstRate: 5, segment: "", amount: 0 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updated[idx].amount = updated[idx].quantity * updated[idx].unitPrice;
    }
    setItems(updated);
  };

  const selectProduct = (idx: number, product: any) => {
    const updated = [...items];
    updated[idx] = {
      ...updated[idx],
      productId: product.id,
      name: product.name,
      hsnCode: product.hsnCode || "0401",
      unitPrice: parseFloat(product.price || product.sellingPrice || 0),
      gstRate: parseFloat(product.gstPercent || product.gstRate || 5),
      segment: product.segment || product.category || "",
      amount: updated[idx].quantity * parseFloat(product.price || product.sellingPrice || 0),
    };
    setItems(updated);
    setOpenDropdown(null);
    setProductSearches({ ...productSearches, [idx]: "" });
  };

  const subtotal = items.reduce((a, i) => {
    const lineAmount = i.quantity * i.unitPrice;
    return a + lineAmount / (1 + i.gstRate / 100);
  }, 0);
  const gstAmount = items.reduce((a, i) => {
    const lineAmount = i.quantity * i.unitPrice;
    return a + lineAmount - lineAmount / (1 + i.gstRate / 100);
  }, 0);
  const totalAmount = subtotal + gstAmount;

  const handleSubmit = () => {
    if (!customerName.trim()) {
      toast({ title: "Customer name is required", variant: "destructive" });
      return;
    }
    if (items.some(i => !i.name || i.unitPrice <= 0)) {
      toast({ title: "All items must have a product and price", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      merchantId,
      customerType,
      customerName,
      customerGstin: customerGstin || null,
      customerAddress: customerAddress || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      deliveryRequired,
      deliveryAddress: deliveryRequired ? deliveryAddress : null,
      notes: notes || null,
      items: items.map(i => ({
        productId: i.productId,
        name: i.name,
        hsnCode: i.hsnCode,
        quantity: i.quantity,
        caseQty: i.caseQty,
        unitPrice: i.unitPrice,
        gstRate: i.gstRate,
        segment: i.segment,
      })),
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Bulk Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Customer Type</Label>
              <Select value={customerType} onValueChange={setCustomerType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Customer Name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer/organization name" />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" maxLength={15} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="email@example.com" type="email" />
            </div>
            <div className="md:col-span-2">
              <Label>Customer Address</Label>
              <Textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Full billing address" rows={2} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <Label className="text-base font-semibold">Line Items</Label>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Add Item</Button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <div className="md:col-span-2 relative" ref={(el) => { dropdownRefs.current[idx] = el; }}>
                      <Label className="text-xs">Product</Label>
                      <div className="relative">
                        <Input
                          value={openDropdown === idx ? (productSearches[idx] ?? item.name) : item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setProductSearches({ ...productSearches, [idx]: val });
                            updateItem(idx, "name", val);
                            setOpenDropdown(idx);
                          }}
                          onFocus={() => {
                            setProductSearches({ ...productSearches, [idx]: item.name || "" });
                            setOpenDropdown(idx);
                          }}
                          placeholder="Search or type product name..."
                        />
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                      {openDropdown === idx && (
                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-900 border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {catalogProducts
                            .filter((p: any) => !productSearches[idx] || p.name?.toLowerCase().includes((productSearches[idx] || "").toLowerCase()))
                            .slice(0, 15)
                            .map((p: any) => (
                              <div
                                key={p.id}
                                className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-sm flex justify-between"
                                onClick={() => selectProduct(idx, p)}
                              >
                                <span>{p.name}</span>
                                {p.segment && <Badge variant="outline" className="text-xs ml-2">{p.segment}</Badge>}
                              </div>
                            ))}
                          {productSearches[idx] && catalogProducts.filter((p: any) => p.name?.toLowerCase().includes((productSearches[idx] || "").toLowerCase())).length === 0 && (
                            <div
                              className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer text-sm text-blue-600 dark:text-blue-400 border-t"
                              onClick={() => {
                                updateItem(idx, "name", productSearches[idx] || "");
                                setOpenDropdown(null);
                              }}
                            >
                              Use "{productSearches[idx]}" as custom product
                            </div>
                          )}
                          {!productSearches[idx] && catalogProducts.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500">Type a product name manually</div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">HSN Code</Label>
                      <Input value={item.hsnCode} onChange={(e) => updateItem(idx, "hsnCode", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <Label className="text-xs">Unit Price (₹)</Label>
                      <Input type="number" min={0} step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Label className="text-xs">GST %</Label>
                        <Input type="number" min={0} max={28} value={item.gstRate} onChange={(e) => updateItem(idx, "gstRate", parseFloat(e.target.value) || 0)} />
                      </div>
                      {items.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-red-500 mb-0.5"><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Line Amount: ₹{(item.quantity * item.unitPrice).toLocaleString("en-IN")}</span>
                    {item.segment && <Badge variant="secondary" className="text-xs">{item.segment}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <div className="text-right space-y-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Subtotal: ₹{subtotal.toFixed(2)}</p>
              <p className="text-sm text-gray-500">GST: ₹{gstAmount.toFixed(2)}</p>
              <p className="text-lg font-bold">Total: ₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Label>Delivery Required</Label>
              <input type="checkbox" checked={deliveryRequired} onChange={(e) => setDeliveryRequired(e.target.checked)} className="h-4 w-4" />
            </div>
            {deliveryRequired && (
              <div className="md:col-span-2">
                <Label>Delivery Address</Label>
                <Textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Delivery address (can differ from billing)" rows={2} />
              </div>
            )}
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
            {createMutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
