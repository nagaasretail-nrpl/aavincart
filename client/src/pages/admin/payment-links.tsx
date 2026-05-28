import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
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
  Plus, Copy, XCircle, RefreshCw, Search, Link2, ExternalLink,
  CheckCircle, Clock, Ban, IndianRupee, Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  partially_paid: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
};

const STATUS_ICONS: Record<string, any> = {
  active: <Clock className="h-3 w-3" />,
  paid: <CheckCircle className="h-3 w-3" />,
  expired: <Clock className="h-3 w-3" />,
  cancelled: <Ban className="h-3 w-3" />,
};

export default function PaymentLinks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: links = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/cashfree/payment-links", filterStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/cashfree/payment-links?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payment links");
      return res.json();
    },
  });

  const filteredLinks = links.filter((link: any) =>
    !searchQuery ||
    link.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.linkId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.customerPhone?.includes(searchQuery)
  );

  const cancelMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const res = await apiRequest("POST", `/api/cashfree/payment-links/${linkId}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/payment-links"] });
      toast({ title: "Payment link cancelled" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const refreshStatusMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const res = await fetch(`/api/cashfree/payment-links/${linkId}/status`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to refresh status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/payment-links"] });
      toast({ title: "Status refreshed" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const stats = {
    total: links.length,
    active: links.filter((l: any) => l.status === "active").length,
    paid: links.filter((l: any) => l.status === "paid").length,
    expired: links.filter((l: any) => l.status === "expired").length,
    totalValue: links.reduce((a: number, l: any) => a + parseFloat(l.amount || 0), 0),
    collectedValue: links.filter((l: any) => l.status === "paid").reduce((a: number, l: any) => a + parseFloat(l.amount || 0), 0),
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Links</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage Cashfree payment links for B2B invoices and bulk orders</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" /> Create Payment Link
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="p-3"><div className="text-xs text-gray-500">Total Links</div><div className="text-xl font-bold">{stats.total}</div></Card>
          <Card className="p-3"><div className="text-xs text-gray-500">Active</div><div className="text-xl font-bold text-blue-600">{stats.active}</div></Card>
          <Card className="p-3"><div className="text-xs text-gray-500">Paid</div><div className="text-xl font-bold text-green-600">{stats.paid}</div></Card>
          <Card className="p-3"><div className="text-xs text-gray-500">Expired</div><div className="text-xl font-bold text-gray-600">{stats.expired}</div></Card>
          <Card className="p-3"><div className="text-xs text-gray-500">Total Value</div><div className="text-xl font-bold">₹{stats.totalValue.toLocaleString("en-IN")}</div></Card>
          <Card className="p-3"><div className="text-xs text-gray-500">Collected</div><div className="text-xl font-bold text-green-600">₹{stats.collectedValue.toLocaleString("en-IN")}</div></Card>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search by customer, link ID, or purpose..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        <div className="hidden md:block">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Related</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filteredLinks.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">No payment links found</TableCell></TableRow>
                ) : filteredLinks.map((link: any) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-mono text-xs">{link.linkId}</TableCell>
                    <TableCell>
                      <div className="font-medium">{link.customerName || "-"}</div>
                      {link.customerPhone && <div className="text-xs text-gray-500">{link.customerPhone}</div>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{link.purpose || "-"}</TableCell>
                    <TableCell className="text-right font-medium">₹{parseFloat(link.amount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[link.status] || STATUS_COLORS.active}>
                        {STATUS_ICONS[link.status]} <span className="ml-1">{link.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {link.relatedOrderId && <Badge variant="outline" className="text-xs">Order: {link.relatedOrderId.substring(0, 8)}</Badge>}
                      {link.relatedInvoiceId && <Badge variant="outline" className="text-xs">Inv: {link.relatedInvoiceId}</Badge>}
                      {!link.relatedOrderId && !link.relatedInvoiceId && <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{link.createdAt ? new Date(link.createdAt).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{link.expiresAt ? new Date(link.expiresAt).toLocaleDateString("en-IN") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {link.linkUrl && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => copyLink(link.linkUrl)} title="Copy Link">
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => window.open(link.linkUrl, "_blank")} title="Open Link">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => refreshStatusMutation.mutate(link.linkId)} title="Refresh Status" disabled={refreshStatusMutation.isPending}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        {link.status === "active" && (
                          <Button size="sm" variant="ghost" onClick={() => cancelMutation.mutate(link.linkId)} title="Cancel Link" disabled={cancelMutation.isPending}>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
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
          ) : filteredLinks.length === 0 ? (
            <Card className="p-6 text-center text-gray-500">No payment links found</Card>
          ) : filteredLinks.map((link: any) => (
            <Card key={link.id} className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-mono text-xs text-gray-500">{link.linkId}</p>
                  <p className="font-semibold">{link.customerName || "No customer"}</p>
                  {link.purpose && <p className="text-sm text-gray-500 truncate">{link.purpose}</p>}
                </div>
                <Badge className={STATUS_COLORS[link.status] || STATUS_COLORS.active}>{link.status}</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">{link.createdAt ? new Date(link.createdAt).toLocaleDateString("en-IN") : ""}</span>
                <span className="font-bold text-gray-900 dark:text-white">₹{parseFloat(link.amount).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex gap-2 mt-3">
                {link.linkUrl && (
                  <Button size="sm" variant="outline" onClick={() => copyLink(link.linkUrl)}>
                    <Copy className="h-3 w-3 mr-1" /> Copy
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => refreshStatusMutation.mutate(link.linkId)}>
                  <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
                {link.status === "active" && (
                  <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate(link.linkId)}>
                    <XCircle className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {showCreate && <CreatePaymentLinkDialog onClose={() => setShowCreate(false)} />}
      </div>
    </AdminLayout>
  );
}

function CreatePaymentLinkDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [partialPayments, setPartialPayments] = useState(false);
  const [expiryDays, setExpiryDays] = useState("7");
  const [relatedOrderId, setRelatedOrderId] = useState("");
  const [relatedInvoiceId, setRelatedInvoiceId] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/cashfree/payment-links", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashfree/payment-links"] });
      toast({ title: "Payment link created", description: data.linkUrl ? "Link is ready to share" : "Link created successfully" });
      onClose();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (!customerName) {
      toast({ title: "Customer name is required", variant: "destructive" });
      return;
    }
    if (!customerPhone) {
      toast({ title: "Customer phone is required", variant: "destructive" });
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays || "7"));

    createMutation.mutate({
      amount: parseFloat(amount),
      purpose,
      customerName,
      customerEmail,
      customerPhone,
      partialPayments,
      expiresAt: expiresAt.toISOString(),
      relatedOrderId: relatedOrderId || undefined,
      relatedInvoiceId: relatedInvoiceId || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-purple-600" />
            Create Payment Link
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Amount (₹) *</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" step="0.01" />
            </div>
            <div className="col-span-2">
              <Label>Purpose / Description</Label>
              <Textarea placeholder="e.g., Payment for Bulk Invoice #INV-2026-001" value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Customer Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Customer Name *</Label>
                <Input placeholder="Business / Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input placeholder="9876543210" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="customer@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Options</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry (days)</Label>
                <Select value={expiryDays} onValueChange={setExpiryDays}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="15">15 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={partialPayments} onCheckedChange={setPartialPayments} />
                <Label className="text-sm">Allow partial payments</Label>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Link to (optional)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Order ID</Label>
                <Input placeholder="Order reference" value={relatedOrderId} onChange={(e) => setRelatedOrderId(e.target.value)} />
              </div>
              <div>
                <Label>Invoice ID</Label>
                <Input placeholder="Invoice reference" value={relatedInvoiceId} onChange={(e) => setRelatedInvoiceId(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
            {createMutation.isPending ? "Creating..." : "Create Payment Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
