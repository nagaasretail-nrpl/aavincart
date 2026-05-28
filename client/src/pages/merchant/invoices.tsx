import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, RefreshCw, Download } from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);
}

export default function MerchantInvoices() {
  const { merchantId } = useMerchantContext();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: invoices = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/invoices", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/invoices?merchantId=${merchantId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!merchantId,
  });

  const filtered = invoices.filter((inv: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.customerName?.toLowerCase().includes(q) ||
      inv.orderId?.toString().includes(q)
    );
  });

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold">Invoices</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Manage sales invoices ({filtered.length} total)
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No invoices found</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden md:block">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber || inv.id}</TableCell>
                        <TableCell>{inv.customerName || "N/A"}</TableCell>
                        <TableCell>
                          {inv.createdAt
                            ? new Date(inv.createdAt).toLocaleDateString("en-IN")
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={inv.status === "paid" ? "default" : "secondary"}
                            className={inv.status === "paid" ? "bg-green-500" : ""}
                          >
                            {inv.status || "pending"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="md:hidden space-y-3">
              {filtered.map((inv: any) => (
                <Card key={inv.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{inv.invoiceNumber || inv.id}</span>
                      <Badge
                        variant={inv.status === "paid" ? "default" : "secondary"}
                        className={inv.status === "paid" ? "bg-green-500 text-xs" : "text-xs"}
                      >
                        {inv.status || "pending"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{inv.customerName || "N/A"}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {inv.createdAt
                          ? new Date(inv.createdAt).toLocaleDateString("en-IN")
                          : "N/A"}
                      </span>
                      <span className="font-bold">{formatCurrency(inv.totalAmount)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </MerchantLayout>
  );
}
