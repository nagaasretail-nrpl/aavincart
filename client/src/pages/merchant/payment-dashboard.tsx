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
import { Download, IndianRupee, TrendingUp, Clock, AlertTriangle, RefreshCw, CheckCircle, Percent, CreditCard, Banknote, PieChart, FileSpreadsheet } from "lucide-react";

const kpiConfig = [
  { key: "todayPaid", label: "Today Paid", icon: IndianRupee, color: "text-green-600" },
  { key: "monthPaid", label: "Month Paid", icon: TrendingUp, color: "text-blue-600" },
  { key: "totalSettled", label: "Total Settled", icon: CheckCircle, color: "text-emerald-600" },
  { key: "pendingSettlement", label: "Pending Settlement", icon: Clock, color: "text-yellow-600" },
  { key: "failedPayments", label: "Failed Payments", icon: AlertTriangle, color: "text-red-600" },
  { key: "refundAmount", label: "Refund Amount", icon: RefreshCw, color: "text-orange-600" },
  { key: "successRate", label: "Success Rate", icon: Percent, color: "text-purple-600" },
];

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

const statusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case "captured":
    case "paid":
    case "success":
      return "default" as const;
    case "failed":
    case "error":
      return "destructive" as const;
    case "pending":
    case "created":
      return "secondary" as const;
    case "refunded":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

function formatCurrency(val: any) {
  if (val === null || val === undefined) return "₹0";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "₹0";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function DateRangeFilter({ startDate, endDate, onStartChange, onEndChange }: {
  startDate: string; endDate: string; onStartChange: (v: string) => void; onEndChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
        <Input type="date" value={startDate} onChange={(e) => onStartChange(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
        <Input type="date" value={endDate} onChange={(e) => onEndChange(e.target.value)} />
      </div>
    </div>
  );
}

function ExportButton({ reportType, startDate, endDate, label }: { reportType: string; startDate: string; endDate: string; label?: string }) {
  const handleExport = (format: string) => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    window.open(`/api/merchant/payment-reports/${reportType}/export?${params.toString()}`, "_blank");
  };
  return (
    <div className="flex gap-2">
      <Button onClick={() => handleExport("xlsx")} variant="outline" size="sm" className="gap-1">
        <Download className="h-3 w-3" /> {label || "XLSX"}
      </Button>
      <Button onClick={() => handleExport("csv")} variant="outline" size="sm" className="gap-1">
        <FileSpreadsheet className="h-3 w-3" /> CSV
      </Button>
    </div>
  );
}

function RefundRegisterTab() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const { data: refunds = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/merchant/payment-reports/refund-register", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/merchant/payment-reports/refund-register?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        <ExportButton reportType="refund-register" startDate={startDate} endDate={endDate} />
      </div>
      {isLoading ? <TableSkeleton /> : refunds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No refunds found for the selected period.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Refund ID</TableHead>
                <TableHead>Payment ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.map((r: any, idx: number) => (
                <TableRow key={r.id || idx}>
                  <TableCell className="whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{r.gatewayRefundId || r.id || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{r.paymentTransactionId || "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.amount)}</TableCell>
                  <TableCell><Badge variant={statusBadgeVariant(r.status)}>{r.status || "unknown"}</Badge></TableCell>
                  <TableCell>{r.reason || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function PaymentMethodsTab() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const { data: methods = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/merchant/payment-reports/payment-method-summary", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/merchant/payment-reports/payment-method-summary?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const total = methods.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        <ExportButton reportType="payment-method-summary" startDate={startDate} endDate={endDate} />
      </div>
      {isLoading ? <TableSkeleton /> : methods.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <PieChart className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No payment method data available.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {methods.map((m: any) => (
              <Card key={m.method}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground capitalize">{m.method}</span>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(m.amount)}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">{m.count} txns</span>
                    <span className="text-xs text-muted-foreground">{total > 0 ? ((m.amount / total) * 100).toFixed(1) : 0}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fees</TableHead>
                <TableHead className="text-right">Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {methods.map((m: any) => (
                <TableRow key={m.method}>
                  <TableCell className="capitalize font-medium">{m.method}</TableCell>
                  <TableCell className="text-right">{m.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.amount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.fee)}</TableCell>
                  <TableCell className="text-right">{total > 0 ? ((m.amount / total) * 100).toFixed(1) : 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function GatewayFeesTab() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const { data: fees, isLoading } = useQuery<any>({
    queryKey: ["/api/merchant/payment-reports/gateway-fee-summary", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/merchant/payment-reports/gateway-fee-summary?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        <ExportButton reportType="gateway-fee-summary" startDate={startDate} endDate={endDate} />
      </div>
      {isLoading ? <TableSkeleton /> : !fees ? (
        <div className="text-center py-12 text-muted-foreground">
          <Banknote className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No fee data available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Gross Collections</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(fees.gross)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Gateway Fees</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(fees.fee)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">GST on Fees</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(fees.tax)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">Net Settlement</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(fees.net)}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SettlementTab() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const { data: settlements = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/merchant/payment-reports/settlement-reconciliation", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/merchant/payment-reports/settlement-reconciliation?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <DateRangeFilter startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} />
        <ExportButton reportType="settlement-reconciliation" startDate={startDate} endDate={endDate} />
      </div>
      {isLoading ? <TableSkeleton /> : settlements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Banknote className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No settlement records found. Settlements appear here when your admin imports them.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Matched</TableHead>
                <TableHead className="text-right">Unmatched</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map((s: any, idx: number) => (
                <TableRow key={s.id || idx}>
                  <TableCell className="whitespace-nowrap">{s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "—"}</TableCell>
                  <TableCell>{s.fileName || "—"}</TableCell>
                  <TableCell className="text-right">{s.totalRecords ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.totalAmount)}</TableCell>
                  <TableCell className="text-right">{s.matchedCount ?? "—"}</TableCell>
                  <TableCell className="text-right">{s.unmatchedCount ?? "—"}</TableCell>
                  <TableCell><Badge variant={statusBadgeVariant(s.status || "pending")}>{s.status || "pending"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function MerchantPaymentDashboard() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");

  const { data: summary, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ["/api/merchant/payment-summary"],
  });

  const { data: transactions, isLoading: txnLoading } = useQuery<any[]>({
    queryKey: ["/api/merchant/payment-transactions", startDate, endDate, status, paymentMethod],
  });

  const handleExport = () => {
    const exportParams = new URLSearchParams();
    exportParams.set("format", "xlsx");
    if (startDate) exportParams.set("startDate", startDate);
    if (endDate) exportParams.set("endDate", endDate);
    if (status && status !== "all") exportParams.set("status", status);
    if (paymentMethod && paymentMethod !== "all") exportParams.set("paymentMethod", paymentMethod);
    window.open(`/api/merchant/payment-transactions/export?${exportParams.toString()}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your payment collections, transactions, and reports</p>
        </div>

        {summaryLoading ? (
          <KPISkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
            {kpiConfig.map((kpi) => {
              const value = summary?.[kpi.key];
              const isPercent = kpi.key === "successRate";
              const displayValue = isPercent
                ? `${value !== undefined ? Number(value).toFixed(1) : "0"}%`
                : formatCurrency(value);

              return (
                <Card key={kpi.key}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                      <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{displayValue}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="transactions" className="gap-1"><IndianRupee className="h-3 w-3" /> Transactions</TabsTrigger>
            <TabsTrigger value="refunds" className="gap-1"><RefreshCw className="h-3 w-3" /> Refunds</TabsTrigger>
            <TabsTrigger value="methods" className="gap-1"><CreditCard className="h-3 w-3" /> Payment Methods</TabsTrigger>
            <TabsTrigger value="fees" className="gap-1"><Banknote className="h-3 w-3" /> Gateway Fees</TabsTrigger>
            <TabsTrigger value="settlements" className="gap-1"><CheckCircle className="h-3 w-3" /> Settlements</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <CardTitle>Transaction History</CardTitle>
                  <Button onClick={handleExport} variant="outline" size="sm" className="gap-1">
                    <Download className="h-3 w-3" /> Export XLSX
                  </Button>
                </div>
                <div className="flex flex-col md:flex-row gap-3 mt-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="captured">Captured</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="All Methods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="netbanking">Net Banking</SelectItem>
                        <SelectItem value="wallet">Wallet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {txnLoading ? (
                  <TableSkeleton />
                ) : !transactions || transactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <IndianRupee className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p>No transactions found. Try adjusting filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Gateway Payment ID</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Fee</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((txn: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="whitespace-nowrap">{txn.date || txn.createdAt ? new Date(txn.date || txn.createdAt).toLocaleDateString("en-IN") : "—"}</TableCell>
                            <TableCell className="font-mono text-sm">{txn.orderId || "—"}</TableCell>
                            <TableCell className="font-mono text-sm">{txn.gatewayPaymentId || "—"}</TableCell>
                            <TableCell>{txn.method || txn.paymentMethod || "—"}</TableCell>
                            <TableCell className="text-right">{formatCurrency(txn.amount)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(txn.fee)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(txn.net)}</TableCell>
                            <TableCell>
                              <Badge variant={statusBadgeVariant(txn.status)}>
                                {txn.status || "unknown"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refunds">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Refund Register</CardTitle>
              </CardHeader>
              <CardContent>
                <RefundRegisterTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="methods">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> Payment Method Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentMethodsTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Gateway Fee Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <GatewayFeesTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settlements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> Settlement Reconciliation</CardTitle>
              </CardHeader>
              <CardContent>
                <SettlementTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
