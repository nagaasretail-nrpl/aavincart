import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IndianRupee,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  BarChart3,
  Search,
  Download,
  Banknote,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function formatCurrency(val: any) {
  if (val === null || val === undefined) return "₹0.00";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "₹0.00";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "paid":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
    case "partial":
    case "partially_paid":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>;
    case "unpaid":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Unpaid</Badge>;
    case "delivered":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Delivered</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    default:
      return <Badge variant="secondary">{status || "unknown"}</Badge>;
  }
}

export default function CreditLedger() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (customerFilter) params.set("customer", customerFilter);
  if (segmentFilter && segmentFilter !== "all") params.set("segment", segmentFilter);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/credit-ledger/report", startDate, endDate, customerFilter, segmentFilter],
    queryFn: async () => {
      const res = await fetch(`/api/credit-ledger/report?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch credit ledger");
      return res.json();
    },
  });

  const summary = data?.summary || { totalCreditIssued: 0, totalCollected: 0, totalOutstanding: 0, overdue: { count: 0, total: 0 }, creditOrderCount: 0, collectionCount: 0, outstandingCount: 0 };
  const aging = data?.aging || { "0-30": { count: 0, total: 0 }, "31-60": { count: 0, total: 0 }, "61-90": { count: 0, total: 0 }, "90+": { count: 0, total: 0 } };
  const customerSummaries = data?.customerSummaries || [];
  const recentCreditOrders = data?.recentCreditOrders || [];
  const recentCollections = data?.recentCollections || [];
  const outstandingEntries = data?.outstandingEntries || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Credit Business Ledger
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Track credit orders, outstanding balances, and collections</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[160px]" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search customer..." value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="pl-8 w-[200px]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Segment</label>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="Fresh Milk">Fresh Milk</SelectItem>
                <SelectItem value="Products">Products</SelectItem>
                <SelectItem value="Ice Cream">Ice Cream</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <IndianRupee className="h-4 w-4 text-blue-200" />
                <p className="text-xs text-blue-100">Total Credit Issued</p>
              </div>
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(summary.totalCreditIssued)}</p>
              <p className="text-xs text-blue-200 mt-1">{summary.creditOrderCount} orders</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-200" />
                <p className="text-xs text-green-100">Total Collected</p>
              </div>
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(summary.totalCollected)}</p>
              <p className="text-xs text-green-200 mt-1">{summary.collectionCount} collections</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-orange-200" />
                <p className="text-xs text-orange-100">Total Outstanding</p>
              </div>
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</p>
              <p className="text-xs text-orange-200 mt-1">{summary.outstandingCount} entries</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-200" />
                <p className="text-xs text-red-100">Overdue</p>
              </div>
              <p className="text-lg sm:text-2xl font-bold">{formatCurrency(summary.overdue.total)}</p>
              <p className="text-xs text-red-200 mt-1">{summary.overdue.count} overdue</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Aging Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">0-30 Days</p>
                <p className="text-xl font-bold text-green-800 dark:text-green-300">{formatCurrency(aging["0-30"].total)}</p>
                <p className="text-xs text-green-600 dark:text-green-500">{aging["0-30"].count} entries</p>
              </div>
              <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-900/20">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">31-60 Days</p>
                <p className="text-xl font-bold text-yellow-800 dark:text-yellow-300">{formatCurrency(aging["31-60"].total)}</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500">{aging["31-60"].count} entries</p>
              </div>
              <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">61-90 Days</p>
                <p className="text-xl font-bold text-orange-800 dark:text-orange-300">{formatCurrency(aging["61-90"].total)}</p>
                <p className="text-xs text-orange-600 dark:text-orange-500">{aging["61-90"].count} entries</p>
              </div>
              <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">90+ Days</p>
                <p className="text-xl font-bold text-red-800 dark:text-red-300">{formatCurrency(aging["90+"].total)}</p>
                <p className="text-xs text-red-600 dark:text-red-500">{aging["90+"].count} entries</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm"><Users className="h-3 w-3" /> Customer Balances</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1 text-xs sm:text-sm"><IndianRupee className="h-3 w-3" /> Credit Orders</TabsTrigger>
            <TabsTrigger value="outstanding" className="gap-1 text-xs sm:text-sm"><TrendingDown className="h-3 w-3" /> Outstanding</TabsTrigger>
            <TabsTrigger value="collections" className="gap-1 text-xs sm:text-sm"><Banknote className="h-3 w-3" /> Collections</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer-wise Credit Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {customerSummaries.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No credit customers found.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Total Credit</TableHead>
                            <TableHead className="text-right">Collected</TableHead>
                            <TableHead className="text-right">Outstanding</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerSummaries.map((c: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell className="text-right">{c.orders}</TableCell>
                              <TableCell className="text-right">{formatCurrency(c.creditTotal)}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(c.collected)}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">{formatCurrency(c.outstanding)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-2 p-3">
                      {customerSummaries.map((c: any, idx: number) => (
                        <Card key={idx} className="border shadow-sm">
                          <CardContent className="p-3">
                            <p className="font-medium text-sm mb-2">{c.name}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-muted-foreground">Orders:</span> {c.orders}</div>
                              <div><span className="text-muted-foreground">Credit:</span> {formatCurrency(c.creditTotal)}</div>
                              <div><span className="text-muted-foreground">Collected:</span> <span className="text-green-600">{formatCurrency(c.collected)}</span></div>
                              <div><span className="text-muted-foreground">Outstanding:</span> <span className="text-red-600 font-semibold">{formatCurrency(c.outstanding)}</span></div>
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

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Credit Orders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentCreditOrders.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <IndianRupee className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No credit orders found.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Segment</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentCreditOrders.map((o: any) => (
                            <TableRow key={o.id}>
                              <TableCell className="whitespace-nowrap text-sm">{formatDate(o.createdAt)}</TableCell>
                              <TableCell className="font-mono text-sm">{o.displayId || o.id?.slice(0, 8)}</TableCell>
                              <TableCell className="font-medium">{o.customerName}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{o.productSegment || "—"}</Badge></TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(o.total)}</TableCell>
                              <TableCell>{getStatusBadge(o.status)}</TableCell>
                              <TableCell>{getStatusBadge(o.paymentStatus || "unpaid")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-2 p-3">
                      {recentCreditOrders.map((o: any) => (
                        <Card key={o.id} className="border shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-mono text-xs text-muted-foreground">{o.displayId || o.id?.slice(0, 8)}</p>
                                <p className="font-medium text-sm">{o.customerName}</p>
                              </div>
                              {getStatusBadge(o.status)}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
                              <span className="font-bold">{formatCurrency(o.total)}</span>
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

          <TabsContent value="outstanding">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Outstanding Entries</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {outstandingEntries.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No outstanding entries found.</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice Date</TableHead>
                            <TableHead>Invoice No</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Invoice Amt</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outstandingEntries.map((e: any) => (
                            <TableRow key={e.id}>
                              <TableCell className="whitespace-nowrap text-sm">{formatDate(e.invoiceDate)}</TableCell>
                              <TableCell className="font-mono text-sm">{e.invoiceNumber || "—"}</TableCell>
                              <TableCell className="font-medium">{e.customerName || e.customerId}</TableCell>
                              <TableCell className="text-right">{formatCurrency(e.invoiceAmount)}</TableCell>
                              <TableCell className="text-right text-green-600">{formatCurrency(e.paidAmount)}</TableCell>
                              <TableCell className="text-right font-semibold text-red-600">{formatCurrency(e.balanceAmount)}</TableCell>
                              <TableCell className="whitespace-nowrap text-sm">{formatDate(e.dueDate)}</TableCell>
                              <TableCell>{getStatusBadge(e.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-2 p-3">
                      {outstandingEntries.map((e: any) => (
                        <Card key={e.id} className="border shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-mono text-xs text-muted-foreground">{e.invoiceNumber || "—"}</p>
                                <p className="font-medium text-sm">{e.customerName || e.customerId}</p>
                              </div>
                              {getStatusBadge(e.status)}
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                              <div><span className="text-muted-foreground">Invoice:</span> {formatCurrency(e.invoiceAmount)}</div>
                              <div><span className="text-muted-foreground">Paid:</span> <span className="text-green-600">{formatCurrency(e.paidAmount)}</span></div>
                              <div><span className="text-muted-foreground">Balance:</span> <span className="text-red-600 font-semibold">{formatCurrency(e.balanceAmount)}</span></div>
                              <div><span className="text-muted-foreground">Due:</span> {formatDate(e.dueDate)}</div>
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

          <TabsContent value="collections">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Collection History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentCollections.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Banknote className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p>No collections found for the selected period.</p>
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
                            <TableHead>Mode</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentCollections.map((c: any) => (
                            <TableRow key={c.id}>
                              <TableCell className="whitespace-nowrap text-sm">{formatDate(c.collectionDate || c.createdAt)}</TableCell>
                              <TableCell className="font-medium">{c.customerName || c.customerId}</TableCell>
                              <TableCell className="font-mono text-sm">{c.invoiceNumber || "—"}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">{formatCurrency(c.amount)}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize text-xs">{c.paymentMode}</Badge></TableCell>
                              <TableCell className="text-sm text-muted-foreground">{c.referenceNumber || "—"}</TableCell>
                              <TableCell>{getStatusBadge(c.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="md:hidden space-y-2 p-3">
                      {recentCollections.map((c: any) => (
                        <Card key={c.id} className="border shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-mono text-xs text-muted-foreground">{c.invoiceNumber || "—"}</p>
                                <p className="font-medium text-sm">{c.customerName || c.customerId}</p>
                              </div>
                              <Badge variant="outline" className="capitalize text-xs">{c.paymentMode}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-xs text-muted-foreground">{formatDate(c.collectionDate || c.createdAt)}</span>
                              <span className="font-bold text-green-600">{formatCurrency(c.amount)}</span>
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
    </div>
  );
}
