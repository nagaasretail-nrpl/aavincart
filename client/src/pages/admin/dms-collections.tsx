import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingDown,
  Loader2,
} from "lucide-react";

interface Collection {
  id: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  invoiceNumber: string;
  amount: number;
  paymentMode: string;
  referenceNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  remarks?: string;
  status: string;
  collectedAt: string;
  createdAt: string;
}

interface CollectionSummary {
  totalCollected: number;
  cash: number;
  card: number;
  upi: number;
  rtgsNeft: number;
  cheque: number;
  count: number;
}

interface Outstanding {
  id: string;
  merchantId: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
  status: string;
  createdAt: string;
}

interface AgingAnalysis {
  days0to30: { count: number; total: number };
  days31to60: { count: number; total: number };
  days61to90: { count: number; total: number };
  days90plus: { count: number; total: number };
}

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
  { value: "rtgs", label: "RTGS" },
  { value: "neft", label: "NEFT" },
  { value: "cheque", label: "Cheque" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
];

function getAgingDays(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function getAgingBadge(dueDate: string) {
  const days = getAgingDays(dueDate);
  if (days <= 30) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{days} days</Badge>;
  if (days <= 60) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{days} days</Badge>;
  if (days <= 90) return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">{days} days</Badge>;
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{days} days</Badge>;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
    case "partially_paid":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>;
    case "unpaid":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Unpaid</Badge>;
    case "collected":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Collected</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DmsCollections({ skipLayout }: { skipLayout?: boolean }) {
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

  const [activeTab, setActiveTab] = useState("collections");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedOutstanding, setSelectedOutstanding] = useState<Outstanding | null>(null);

  const [collectionForm, setCollectionForm] = useState({
    customerId: "",
    customerName: "",
    orderId: "",
    invoiceNumber: "",
    amount: "",
    paymentMode: "cash",
    referenceNumber: "",
    chequeNumber: "",
    chequeDate: "",
    bankName: "",
    remarks: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMode: "cash",
    referenceNumber: "",
  });

  const merchantId = adminAuth?.user?.merchantId || adminAuth?.user?.id || user?.unionId || user?.id || "";

  const collectionsQuery = useQuery<Collection[]>({
    queryKey: ["/api/collections", merchantId, paymentModeFilter !== "all" ? `?paymentMode=${paymentModeFilter}` : ""],
    queryFn: async () => {
      const params = paymentModeFilter !== "all" ? `?paymentMode=${paymentModeFilter}` : "";
      const res = await fetch(`/api/collections/${merchantId}${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json();
    },
    enabled: !!merchantId,
  });

  const summaryQuery = useQuery<CollectionSummary>({
    queryKey: ["/api/collections/summary", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/collections/summary/${merchantId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summary");
      const data = await res.json();
      const s = data?.summary || data || {};
      return {
        totalCollected: s.totalCollected ?? data?.grandTotal ?? 0,
        cash: s.cash ?? 0,
        card: s.card ?? 0,
        upi: s.upi ?? 0,
        rtgsNeft: s.rtgsNeft ?? 0,
        cheque: s.cheque ?? 0,
        count: s.count ?? data?.totalTransactions ?? 0,
      };
    },
    enabled: !!merchantId,
  });

  const outstandingQuery = useQuery<Outstanding[]>({
    queryKey: ["/api/outstanding", merchantId, statusFilter !== "all" ? `?status=${statusFilter}` : ""],
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/outstanding/${merchantId}${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch outstanding");
      return res.json();
    },
    enabled: !!merchantId,
  });

  const agingQuery = useQuery<AgingAnalysis>({
    queryKey: ["/api/outstanding/aging", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/outstanding/aging/${merchantId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch aging");
      const data = await res.json();
      const a = data?.aging || data || {};
      return {
        days0to30: a["0-30"] || a.days0to30 || { total: 0, count: 0 },
        days31to60: a["31-60"] || a.days31to60 || { total: 0, count: 0 },
        days61to90: a["61-90"] || a.days61to90 || { total: 0, count: 0 },
        days90plus: a["90+"] || a.days90plus || { total: 0, count: 0 },
      };
    },
    enabled: !!merchantId,
  });

  const recordCollectionMutation = useMutation({
    mutationFn: async (data: typeof collectionForm) => {
      return apiRequest("POST", "/api/collections", {
        ...data,
        merchantId,
        amount: parseFloat(data.amount),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({ title: "Success", description: "Collection recorded successfully" });
      setShowCollectionDialog(false);
      resetCollectionForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record collection", variant: "destructive" });
    },
  });

  const fifoMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/collections/allocate-fifo", { merchantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding/aging"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({ title: "Success", description: "FIFO allocation completed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "FIFO allocation failed", variant: "destructive" });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof paymentForm }) => {
      return apiRequest("PATCH", `/api/outstanding/${id}/payment`, {
        amount: parseFloat(data.amount),
        paymentMode: data.paymentMode,
        referenceNumber: data.referenceNumber,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/outstanding/aging"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({ title: "Success", description: "Payment recorded successfully" });
      setShowPaymentDialog(false);
      setSelectedOutstanding(null);
      setPaymentForm({ amount: "", paymentMode: "cash", referenceNumber: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to record payment", variant: "destructive" });
    },
  });

  function resetCollectionForm() {
    setCollectionForm({
      customerId: "",
      customerName: "",
      orderId: "",
      invoiceNumber: "",
      amount: "",
      paymentMode: "cash",
      referenceNumber: "",
      chequeNumber: "",
      chequeDate: "",
      bankName: "",
      remarks: "",
    });
  }

  function handleRecordCollection() {
    if (!collectionForm.customerName || !collectionForm.invoiceNumber || !collectionForm.amount) {
      toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    recordCollectionMutation.mutate(collectionForm);
  }

  function handleRecordPayment() {
    if (!selectedOutstanding || !paymentForm.amount) {
      toast({ title: "Validation Error", description: "Please enter payment amount", variant: "destructive" });
      return;
    }
    recordPaymentMutation.mutate({ id: selectedOutstanding.id, data: paymentForm });
  }

  function openPaymentDialog(outstanding: Outstanding) {
    setSelectedOutstanding(outstanding);
    setPaymentForm({ amount: String(outstanding.balance), paymentMode: "cash", referenceNumber: "" });
    setShowPaymentDialog(true);
  }

  const collections = collectionsQuery.data || [];
  const summary = summaryQuery.data || { totalCollected: 0, cash: 0, card: 0, upi: 0, rtgsNeft: 0, cheque: 0, count: 0 };
  const outstandingList = outstandingQuery.data || [];
  const aging = agingQuery.data || { days0to30: { total: 0, count: 0 }, days31to60: { total: 0, count: 0 }, days61to90: { total: 0, count: 0 }, days90plus: { total: 0, count: 0 } };

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
          <DollarSign className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-base sm:text-xl font-bold">DMS Collections & Outstanding</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage collections and track outstanding payments</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { collectionsQuery.refetch(); summaryQuery.refetch(); outstandingQuery.refetch(); agingQuery.refetch(); }}>
          <RefreshCw className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto mb-4 sm:mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="collections" className="text-xs sm:text-sm">
                <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Collections
              </TabsTrigger>
              <TabsTrigger value="outstanding" className="text-xs sm:text-sm">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Outstanding / Aging
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="collections">
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-200" />
                      <p className="text-xs text-blue-100">Total Collected</p>
                    </div>
                    <p className="text-sm sm:text-lg font-bold">{formatCurrency(summary.totalCollected)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-200" />
                      <p className="text-xs text-green-100">Cash</p>
                    </div>
                    <p className="text-sm sm:text-lg font-bold">{formatCurrency(summary.cash)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-200" />
                      <p className="text-xs text-purple-100">Card</p>
                    </div>
                    <p className="text-sm sm:text-lg font-bold">{formatCurrency(summary.card)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <Smartphone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-200" />
                      <p className="text-xs text-orange-100">UPI</p>
                    </div>
                    <p className="text-sm sm:text-lg font-bold">{formatCurrency(summary.upi)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-200" />
                      <p className="text-xs text-indigo-100">RTGS/NEFT</p>
                    </div>
                    <p className="text-sm sm:text-lg font-bold">{formatCurrency(summary.rtgsNeft)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-teal-200" />
                      <p className="text-xs text-teal-100">Cheque</p>
                    </div>
                    <p className="text-sm sm:text-lg font-bold">{formatCurrency(summary.cheque)}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Label className="text-xs sm:text-sm font-medium whitespace-nowrap">Payment Mode:</Label>
                <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full sm:w-auto" onClick={() => setShowCollectionDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record Collection
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Collections List</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {collectionsQuery.isLoading ? (
                  <div className="p-6 text-center text-muted-foreground">Loading collections...</div>
                ) : collections.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <Banknote className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-base sm:text-lg font-medium mb-2">No Collections Found</h3>
                    <p className="text-sm text-muted-foreground">Record your first collection to get started.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Invoice No</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Payment Mode</TableHead>
                            <TableHead>Reference No</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {collections.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="text-sm">{formatDate(c.collectedAt || c.createdAt)}</TableCell>
                              <TableCell className="font-medium">{c.customerName}</TableCell>
                              <TableCell>{c.invoiceNumber}</TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{c.paymentMode}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{c.referenceNumber || "-"}</TableCell>
                              <TableCell>{getStatusBadge(c.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="md:hidden space-y-2 p-3">
                      {collections.map((c) => (
                        <Card key={c.id} className="border shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-mono text-xs text-muted-foreground">{c.invoiceNumber}</p>
                                <p className="font-medium text-sm">{c.customerName}</p>
                              </div>
                              {getStatusBadge(c.status)}
                            </div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <Badge variant="outline" className="capitalize text-xs">{c.paymentMode}</Badge>
                              <span className="font-bold">{formatCurrency(c.amount)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDate(c.collectedAt || c.createdAt)}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outstanding">
            {aging && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">0-30 Days</p>
                        <p className="text-base sm:text-xl font-bold text-green-700">{formatCurrency(aging.days0to30.total)}</p>
                        <p className="text-xs text-muted-foreground">{aging.days0to30.count} invoices</p>
                      </div>
                      <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">31-60 Days</p>
                        <p className="text-base sm:text-xl font-bold text-yellow-700">{formatCurrency(aging.days31to60.total)}</p>
                        <p className="text-xs text-muted-foreground">{aging.days31to60.count} invoices</p>
                      </div>
                      <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">61-90 Days</p>
                        <p className="text-base sm:text-xl font-bold text-orange-700">{formatCurrency(aging.days61to90.total)}</p>
                        <p className="text-xs text-muted-foreground">{aging.days61to90.count} invoices</p>
                      </div>
                      <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-2 sm:p-3 md:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">90+ Days</p>
                        <p className="text-base sm:text-xl font-bold text-red-700">{formatCurrency(aging.days90plus.total)}</p>
                        <p className="text-xs text-muted-foreground">{aging.days90plus.count} invoices</p>
                      </div>
                      <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Label className="text-xs sm:text-sm font-medium whitespace-nowrap">Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => fifoMutation.mutate()}
                disabled={fifoMutation.isPending || outstandingList.length === 0}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${fifoMutation.isPending ? "animate-spin" : ""}`} />
                {fifoMutation.isPending ? "Allocating..." : "Auto-Allocate (FIFO)"}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Outstanding List</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {outstandingQuery.isLoading ? (
                  <div className="p-6 text-center text-muted-foreground">Loading outstanding...</div>
                ) : outstandingList.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-base sm:text-lg font-medium mb-2">No Outstanding Records</h3>
                    <p className="text-sm text-muted-foreground">All payments are up to date.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Invoice No</TableHead>
                            <TableHead>Invoice Date</TableHead>
                            <TableHead className="text-right">Invoice Amt</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Aging</TableHead>
                            <TableHead className="text-center">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outstandingList.map((o) => (
                            <TableRow key={o.id}>
                              <TableCell className="font-medium">{o.customerName}</TableCell>
                              <TableCell>{o.invoiceNumber}</TableCell>
                              <TableCell className="text-sm">{formatDate(o.invoiceDate)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(o.invoiceAmount)}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(o.paidAmount)}</TableCell>
                              <TableCell className="text-right font-medium text-red-600">{formatCurrency(o.balance)}</TableCell>
                              <TableCell className="text-sm">{formatDate(o.dueDate)}</TableCell>
                              <TableCell>{getStatusBadge(o.status)}</TableCell>
                              <TableCell>{getAgingBadge(o.dueDate)}</TableCell>
                              <TableCell className="text-center">
                                {o.status !== "paid" && (
                                  <Button size="sm" variant="outline" onClick={() => openPaymentDialog(o)}>
                                    <Banknote className="h-4 w-4 mr-1" />
                                    Pay
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="md:hidden space-y-2 p-3">
                      {outstandingList.map((o) => (
                        <Card key={o.id} className="border shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-mono text-xs text-muted-foreground">{o.invoiceNumber}</p>
                                <p className="font-medium text-sm">{o.customerName}</p>
                              </div>
                              {getStatusBadge(o.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                              <div>
                                <span className="text-muted-foreground">Invoice: </span>
                                <span>{formatCurrency(o.invoiceAmount)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Paid: </span>
                                <span className="text-green-600">{formatCurrency(o.paidAmount)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Balance: </span>
                                <span className="font-bold text-red-600">{formatCurrency(o.balance)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Aging: </span>
                                {getAgingBadge(o.dueDate)}
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-xs text-muted-foreground">Due: {formatDate(o.dueDate)}</span>
                              {o.status !== "paid" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPaymentDialog(o)}>
                                  <Banknote className="h-3.5 w-3.5 mr-1" />
                                  Pay
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerId">Customer ID</Label>
                <Input
                  id="customerId"
                  value={collectionForm.customerId}
                  onChange={(e) => setCollectionForm((p) => ({ ...p, customerId: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={collectionForm.customerName}
                  onChange={(e) => setCollectionForm((p) => ({ ...p, customerName: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  value={collectionForm.orderId}
                  onChange={(e) => setCollectionForm((p) => ({ ...p, orderId: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  value={collectionForm.invoiceNumber}
                  onChange={(e) => setCollectionForm((p) => ({ ...p, invoiceNumber: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={collectionForm.amount}
                  onChange={(e) => setCollectionForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select
                  value={collectionForm.paymentMode}
                  onValueChange={(val) => setCollectionForm((p) => ({ ...p, paymentMode: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                value={collectionForm.referenceNumber}
                onChange={(e) => setCollectionForm((p) => ({ ...p, referenceNumber: e.target.value }))}
              />
            </div>
            {collectionForm.paymentMode === "cheque" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chequeNumber">Cheque Number</Label>
                  <Input
                    id="chequeNumber"
                    value={collectionForm.chequeNumber}
                    onChange={(e) => setCollectionForm((p) => ({ ...p, chequeNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="chequeDate">Cheque Date</Label>
                  <Input
                    id="chequeDate"
                    type="date"
                    value={collectionForm.chequeDate}
                    onChange={(e) => setCollectionForm((p) => ({ ...p, chequeDate: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={collectionForm.bankName}
                onChange={(e) => setCollectionForm((p) => ({ ...p, bankName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={collectionForm.remarks}
                onChange={(e) => setCollectionForm((p) => ({ ...p, remarks: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCollectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordCollection} disabled={recordCollectionMutation.isPending}>
              {recordCollectionMutation.isPending ? "Saving..." : "Record Collection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedOutstanding && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Customer</span>
                  <span className="font-medium">{selectedOutstanding.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-medium">{selectedOutstanding.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Invoice Amount</span>
                  <span>{formatCurrency(selectedOutstanding.invoiceAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="text-green-600">{formatCurrency(selectedOutstanding.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t pt-2">
                  <span>Balance Due</span>
                  <span className="text-red-600">{formatCurrency(selectedOutstanding.balance)}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="payAmount">Payment Amount *</Label>
                <Input
                  id="payAmount"
                  type="number"
                  min="0"
                  max={selectedOutstanding.balance}
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="payMode">Payment Mode</Label>
                <Select
                  value={paymentForm.paymentMode}
                  onValueChange={(val) => setPaymentForm((p) => ({ ...p, paymentMode: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payRef">Reference Number</Label>
                <Input
                  id="payRef"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNumber: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={recordPaymentMutation.isPending}>
              {recordPaymentMutation.isPending ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Wrapper>
  );
}