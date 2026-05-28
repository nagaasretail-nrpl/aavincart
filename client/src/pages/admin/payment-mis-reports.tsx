import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileSpreadsheet, Activity, AlertTriangle, CreditCard, Building2, BarChart3, Route, RefreshCw } from "lucide-react";

const reportTabs = [
  { key: "merchant-collection", label: "Merchant Collection", icon: Building2, endpoint: "/api/admin/payment-reports/merchant-collection" },
  { key: "failed-transactions", label: "Failed Transactions", icon: AlertTriangle, endpoint: "/api/admin/payment-reports/failed-transactions" },
  { key: "refund-register", label: "Refund Register", icon: RefreshCw, endpoint: "/api/admin/payment-reports/refund-register" },
  { key: "payment-methods", label: "Payment Methods", icon: CreditCard, endpoint: "/api/admin/payment-reports/payment-method-summary" },
  { key: "gateway-fees", label: "Gateway Fees", icon: FileSpreadsheet, endpoint: "/api/admin/payment-reports/gateway-fee-summary" },
  { key: "union-summary", label: "Union Summary", icon: BarChart3, endpoint: "/api/admin/payment-reports/union-summary" },
  { key: "settlement-recon", label: "Settlement Recon", icon: Activity, endpoint: "/api/admin/payment-reports/settlement-reconciliation" },
  { key: "route-collection", label: "Route Collection", icon: Route, endpoint: "/api/admin/payment-reports/route-collection" },
] as const;

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function ReportTab({ tabKey, endpoint }: { tabKey: string; endpoint: string }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [merchantId, setMerchantId] = useState("");

  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (merchantId) params.set("merchantId", merchantId);
  const queryString = params.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  const { data, isLoading } = useQuery<any[]>({
    queryKey: [endpoint, startDate, endDate, merchantId],
  });

  const handleExport = () => {
    const exportParams = new URLSearchParams();
    exportParams.set("format", "csv");
    if (startDate) exportParams.set("startDate", startDate);
    if (endDate) exportParams.set("endDate", endDate);
    if (merchantId) exportParams.set("merchantId", merchantId);
    window.open(`/api/admin/payment-reports/${tabKey}/export?${exportParams.toString()}`, "_blank");
  };

  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Merchant ID</label>
              <Input placeholder="Filter by merchant..." value={merchantId} onChange={(e) => setMerchantId(e.target.value)} />
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No data available. Try adjusting filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="whitespace-nowrap capitalize">
                      {col.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row: any, idx: number) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col} className="whitespace-nowrap">
                        {typeof row[col] === "boolean" ? (
                          <Badge variant={row[col] ? "default" : "destructive"}>
                            {row[col] ? "Yes" : "No"}
                          </Badge>
                        ) : row[col] !== null && row[col] !== undefined ? (
                          String(row[col])
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HealthMonitorTab() {
  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/payment-health"],
  });

  const getStatusBadge = (status: string) => {
    if (status === "healthy") return <Badge className="bg-green-500 hover:bg-green-600">Healthy</Badge>;
    if (status === "warning") return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warning</Badge>;
    return <Badge variant="destructive">Error</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Payment Gateway Health Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No gateway accounts configured yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Merchant ID</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Gateway Active</TableHead>
                  <TableHead>Last Payment Success</TableHead>
                  <TableHead>Last Webhook</TableHead>
                  <TableHead>Pending Settlement</TableHead>
                  <TableHead>Invalid Webhooks</TableHead>
                  <TableHead>Config Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">{row.merchantId}</TableCell>
                    <TableCell>{row.accountName || "—"}</TableCell>
                    <TableCell>
                      <Badge className={row.gatewayActive ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"}>
                        {row.gatewayActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.lastPaymentSuccess || "—"}</TableCell>
                    <TableCell>{row.lastWebhook || "—"}</TableCell>
                    <TableCell>{row.pendingSettlementCount ?? 0}</TableCell>
                    <TableCell>{row.invalidWebhookCount ?? 0}</TableCell>
                    <TableCell>{getStatusBadge(row.configStatus || "error")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PaymentMisReports() {
  const [activeTab, setActiveTab] = useState("merchant-collection");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment MIS Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive payment analytics and reporting dashboard</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto">
            <TabsList className="inline-flex w-auto min-w-full md:min-w-0">
              {reportTabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5 whitespace-nowrap text-xs">
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="health-monitor" className="gap-1.5 whitespace-nowrap text-xs">
                <Activity className="h-3.5 w-3.5" />
                Health Monitor
              </TabsTrigger>
            </TabsList>
          </div>

          {reportTabs.map((tab) => (
            <TabsContent key={tab.key} value={tab.key}>
              <ReportTab tabKey={tab.key} endpoint={tab.endpoint} />
            </TabsContent>
          ))}

          <TabsContent value="health-monitor">
            <HealthMonitorTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
