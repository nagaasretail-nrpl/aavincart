import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
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
  Plus, Trash2, FileText, CheckCircle, XCircle, Search, Eye,
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
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  dispatched: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

interface BulkInvoiceItem {
  name: string;
  hsnCode: string;
  quantity: number;
  caseQty: number;
  unitPrice: number;
  gstRate: number;
  segment: string;
  amount: number;
}

export default function MerchantBulkInvoicesPage() {
  const { merchantId } = useMerchantContext();
  const { toast } = useToast();
  const mid = merchantId || "";

  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: invoices = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/bulk-invoices", mid, filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/bulk-invoices/${mid}?${params}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!mid,
  });

  const filteredInvoices = (invoices || []).filter((inv: any) =>
    !searchQuery ||
    inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/bulk-invoices/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-invoices"] });
      toast({ title: "Status updated" });
    },
  });

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-purple-600" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Bulk Invoices</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Create and manage bulk invoices for corporates and institutions</p>
            </div>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search invoices..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading invoices...</div>
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="font-medium">No bulk invoices found</p>
              <p className="text-sm text-muted-foreground">Create your first bulk invoice to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{inv.customerName}</div>
                      <div className="text-xs text-muted-foreground">{inv.customerType}</div>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{inv.customerType}</TableCell>
                    <TableCell>{(inv.items || []).length} items</TableCell>
                    <TableCell className="font-medium">₹{Number(inv.totalAmount || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${STATUS_COLORS[inv.status] || "bg-gray-100 text-gray-700"}`}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setShowDetail(inv)}><Eye className="h-3.5 w-3.5" /></Button>
                        {inv.status === "draft" && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => statusMutation.mutate({ id: inv.id, status: "confirmed" })}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Confirm
                          </Button>
                        )}
                        {inv.status === "draft" && (
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => statusMutation.mutate({ id: inv.id, status: "cancelled" })}>
                            <XCircle className="h-3.5 w-3.5" />
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

        {showCreate && <CreateBulkInvoiceDialog merchantId={mid} onClose={() => setShowCreate(false)} />}

        {showDetail && (
          <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invoice: {showDetail.invoiceNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Customer:</span> {showDetail.customerName}</div>
                  <div><span className="text-muted-foreground">Type:</span> {showDetail.customerType}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_COLORS[showDetail.status]}>{showDetail.status}</Badge></div>
                  <div><span className="text-muted-foreground">Total:</span> ₹{Number(showDetail.totalAmount || 0).toLocaleString('en-IN')}</div>
                  {showDetail.deliveryAddress && <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {showDetail.deliveryAddress}</div>}
                </div>
                {showDetail.items && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>HSN</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(showDetail.items as any[]).map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{item.name}</TableCell>
                          <TableCell className="text-xs">{item.hsnCode}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.unitPrice}</TableCell>
                          <TableCell className="font-medium">₹{Number(item.amount || 0).toLocaleString('en-IN')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MerchantLayout>
  );
}

function CreateBulkInvoiceDialog({ merchantId, onClose }: { merchantId: string; onClose: () => void }) {
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState("");
  const [customerType, setCustomerType] = useState("corporate");
  const [gstin, setGstin] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState("");
  const [deliveryLng, setDeliveryLng] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<BulkInvoiceItem[]>([{
    name: "", hsnCode: "", quantity: 1, caseQty: 0, unitPrice: 0, gstRate: 5, segment: "Products", amount: 0,
  }]);

  const addItem = () => {
    setItems([...items, { name: "", hsnCode: "", quantity: 1, caseQty: 0, unitPrice: 0, gstRate: 5, segment: "Products", amount: 0 }]);
  };

  const removeItem = (idx: number) => {
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

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/bulk-invoices", {
        merchantId,
        customerName,
        customerType,
        gstin,
        deliveryAddress,
        deliveryLat: deliveryLat ? parseFloat(deliveryLat) : null,
        deliveryLng: deliveryLng ? parseFloat(deliveryLng) : null,
        notes,
        items,
        totalAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bulk-invoices"] });
      toast({ title: "Bulk invoice created" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to create invoice", variant: "destructive" });
    },
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Bulk Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Customer Name</Label>
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Company / Institution name" />
            </div>
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
              <Label>GSTIN</Label>
              <Input value={gstin} onChange={e => setGstin(e.target.value)} placeholder="GST Number" />
            </div>
            <div>
              <Label>Delivery Address</Label>
              <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Full delivery address" />
            </div>
            <div>
              <Label>GPS Latitude</Label>
              <Input type="number" step="any" value={deliveryLat} onChange={e => setDeliveryLat(e.target.value)} placeholder="e.g. 11.6643" />
            </div>
            <div>
              <Label>GPS Longitude</Label>
              <Input type="number" step="any" value={deliveryLng} onChange={e => setDeliveryLng(e.target.value)} placeholder="e.g. 78.1460" />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" rows={2} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Add Item</Button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-end border-b pb-2">
                  <div className="col-span-2">
                    <Label className="text-xs">Product Name</Label>
                    <Input value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">HSN Code</Label>
                    <Input value={item.hsnCode} onChange={e => updateItem(idx, "hsnCode", e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Unit Price</Label>
                    <Input type="number" value={item.unitPrice} onChange={e => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div className="flex items-end gap-1">
                    <div className="flex-1">
                      <Label className="text-xs">Amount</Label>
                      <div className="h-8 flex items-center text-sm font-medium">₹{item.amount.toLocaleString('en-IN')}</div>
                    </div>
                    {items.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" className="h-8 text-red-500" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right mt-3 text-lg font-bold">Total: ₹{totalAmount.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => createMutation.mutate()} disabled={!customerName || items.length === 0 || createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
