import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  BarChart3, CalendarIcon, Download, ShoppingBag, TrendingUp,
  XCircle, IndianRupee, FileText, Users, Package, Clock, Printer
} from "lucide-react";
import { formatOrderId } from "@/lib/format-order-id";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

function parseItems(order: any): any[] {
  const items = order.items || [];
  if (typeof items === "string") {
    try { return JSON.parse(items); } catch { return []; }
  }
  return Array.isArray(items) ? items : [];
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "accepted":
    case "marketing_approved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
    case "assigned_to_delivery":
    case "confirmed":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
}

function downloadExcel(headers: string[], rows: string[][], filename: string) {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(title: string, headers: string[], rows: string[][]) {
  const win = window.open("", "_blank");
  if (!win) return;
  const tableRows = rows.map(row =>
    `<tr>${row.map(cell => `<td style="border:1px solid #ddd;padding:6px 10px;font-size:12px;">${cell}</td>`).join("")}</tr>`
  ).join("");
  const html = `<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p { font-size: 12px; color: #666; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; }
      th { border: 1px solid #333; padding: 8px 10px; font-size: 12px; background: #f5f5f5; text-align: left; }
      td { border: 1px solid #ddd; padding: 6px 10px; font-size: 12px; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>
    <h1>${title}</h1>
    <p>Generated on ${format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
    <table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <script>setTimeout(()=>window.print(),500);</script>
  </body></html>`;
  win.document.write(html);
  win.document.close();
}

function ExportButtons({ title, headers, rows, filename }: { title: string; headers: string[]; rows: string[][]; filename: string }) {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadExcel(headers, rows, filename)}>
        <Download className="h-3.5 w-3.5 mr-1.5" /> Excel
      </Button>
      <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadPDF(title, headers, rows)}>
        <Printer className="h-3.5 w-3.5 mr-1.5" /> PDF
      </Button>
    </div>
  );
}

function ReportsContent() {
  const { merchantId } = useMerchantContext();
  const [activeTab, setActiveTab] = useState("orders");
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const { data: orders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/orders", merchantId, "reports"],
    queryFn: async () => {
      const res = await fetch(`/api/orders?merchantId=${merchantId}`, { credentials: "include" });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.orders || [];
    },
    enabled: !!merchantId,
  });

  const filteredOrders = useMemo(() => {
    if (!startDate && !endDate) return orders;
    return orders.filter((o: any) => {
      const d = o.createdAt ? new Date(o.createdAt) : null;
      if (!d) return false;
      const start = startDate ? startOfDay(startDate) : new Date(0);
      const end = endDate ? endOfDay(endDate) : new Date();
      if (start > end) return d >= end && d <= start;
      return d >= start && d <= end;
    });
  }, [orders, startDate, endDate]);

  const summary = useMemo(() => {
    const total = filteredOrders.length;
    const delivered = filteredOrders.filter((o: any) => o.status === "delivered" || o.status === "completed").length;
    const cancelled = filteredOrders.filter((o: any) => o.status === "cancelled").length;
    const pending = filteredOrders.filter((o: any) => o.status === "pending").length;
    const totalValue = filteredOrders.reduce((sum: number, o: any) => sum + (parseFloat(o.total || "0")), 0);
    const deliveredValue = filteredOrders
      .filter((o: any) => o.status === "delivered" || o.status === "completed")
      .reduce((sum: number, o: any) => sum + (parseFloat(o.total || "0")), 0);
    let totalItems = 0;
    filteredOrders.forEach((o: any) => {
      totalItems += parseItems(o).reduce((s: number, item: any) => s + (item.quantity || 1), 0);
    });
    return { total, delivered, cancelled, pending, totalValue, deliveredValue, totalItems };
  }, [filteredOrders]);

  const itemWiseData = useMemo(() => {
    const map: Record<string, { name: string; segment: string; qty: number; unitPrice: number; revenue: number }> = {};
    filteredOrders.forEach((o: any) => {
      parseItems(o).forEach((item: any) => {
        const name = item.name || item.productName || "Unknown";
        const price = parseFloat(item.price || item.unitPrice || 0);
        const qty = item.quantity || 1;
        const seg = item.segment || item.productSegment || item.category || "";
        if (!map[name]) map[name] = { name, segment: seg, qty: 0, unitPrice: price, revenue: 0 };
        map[name].qty += qty;
        map[name].revenue += price * qty;
        if (price > 0) map[name].unitPrice = price;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [filteredOrders]);

  const segmentWiseData = useMemo(() => {
    const map: Record<string, { segment: string; orders: Set<string>; items: number; revenue: number }> = {};
    filteredOrders.forEach((o: any) => {
      parseItems(o).forEach((item: any) => {
        const seg = item.segment || item.productSegment || item.category || "Other";
        if (!map[seg]) map[seg] = { segment: seg, orders: new Set(), items: 0, revenue: 0 };
        map[seg].orders.add(String(o.id));
        const qty = item.quantity || 1;
        const price = parseFloat(item.price || item.unitPrice || 0);
        map[seg].items += qty;
        map[seg].revenue += price * qty;
      });
    });
    return Object.values(map)
      .map(s => ({ segment: s.segment, ordersCount: s.orders.size, items: s.items, revenue: s.revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const agentWiseData = useMemo(() => {
    const b2bRoles = ["WSD", "DEALER", "RETAILER", "wsd", "dealer", "retailer"];
    const b2b: Record<string, { name: string; role: string; orders: number; revenue: number }> = {};
    const b2c: Record<string, { name: string; role: string; orders: number; revenue: number }> = {};
    filteredOrders.forEach((o: any) => {
      const name = o.customerName || o.customer_name || "Walk-in";
      const role = o.pricingRole || o.pricing_role || "B2C";
      const isB2B = b2bRoles.includes(role);
      const target = isB2B ? b2b : b2c;
      if (!target[name]) target[name] = { name, role: isB2B ? role.toUpperCase() : "B2C", orders: 0, revenue: 0 };
      target[name].orders++;
      target[name].revenue += parseFloat(o.total || "0");
    });
    return {
      b2b: Object.values(b2b).sort((a, b) => b.revenue - a.revenue),
      b2c: Object.values(b2c).sort((a, b) => b.revenue - a.revenue),
    };
  }, [filteredOrders]);

  const statusWiseData = useMemo(() => {
    const map: Record<string, { status: string; count: number; value: number }> = {};
    filteredOrders.forEach((o: any) => {
      const s = o.status || "unknown";
      if (!map[s]) map[s] = { status: s, count: 0, value: 0 };
      map[s].count++;
      map[s].value += parseFloat(o.total || "0");
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [filteredOrders]);

  const dailySalesData = useMemo(() => {
    const map = new Map<string, { date: string; orders: number; delivered: number; cancelled: number; revenue: number }>();
    filteredOrders.forEach((o: any) => {
      const d = o.createdAt ? format(new Date(o.createdAt), "yyyy-MM-dd") : "Unknown";
      const existing = map.get(d) || { date: d, orders: 0, delivered: 0, cancelled: 0, revenue: 0 };
      existing.orders++;
      existing.revenue += parseFloat(o.total || "0");
      if (o.status === "delivered" || o.status === "completed") existing.delivered++;
      if (o.status === "cancelled") existing.cancelled++;
      map.set(d, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOrders]);

  const needsAction = (status: string) => status === "pending" || status === "accepted";

  const LoadingState = () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );

  const EmptyState = ({ icon: Icon, message }: { icon: any; message: string }) => (
    <Card>
      <CardContent className="flex flex-col items-center py-12">
        <Icon className="h-12 w-12 text-gray-300 mb-3" />
        <p className="text-gray-500">{message}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-purple-600" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Sales Reports</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Comprehensive sales analytics for your union</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {startDate ? format(startDate, "dd/MM/yyyy") : "Start Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
          </PopoverContent>
        </Popover>
        <span className="text-gray-400 text-sm">to</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
              {endDate ? format(endDate, "dd/MM/yyyy") : "End Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
          </PopoverContent>
        </Popover>
        {(startDate || endDate) && (
          <Button variant="ghost" size="sm" className="text-xs text-red-500" onClick={() => { setStartDate(undefined); setEndDate(undefined); }}>
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
            <p className="text-xs text-gray-500">Total Orders</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-green-600">{summary.delivered}</p>
            <p className="text-xs text-gray-500">Delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4 text-center">
            <XCircle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold text-red-600">{summary.cancelled}</p>
            <p className="text-xs text-gray-500">Cancelled</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 mx-auto text-purple-500 mb-1" />
            <p className="text-2xl font-bold text-purple-600">{formatINR(summary.totalValue)}</p>
            <p className="text-xs text-gray-500">Total Value</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900">
          <CardContent className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold text-amber-600">{summary.totalItems}</p>
            <p className="text-xs text-gray-500">Items Sold</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
            <TabsTrigger value="orders" className="text-xs">Order-wise</TabsTrigger>
            <TabsTrigger value="items" className="text-xs">Item-wise</TabsTrigger>
            <TabsTrigger value="segments" className="text-xs">Segment-wise</TabsTrigger>
            <TabsTrigger value="agents" className="text-xs">Agent/Customer</TabsTrigger>
            <TabsTrigger value="status" className="text-xs">Status-wise</TabsTrigger>
            <TabsTrigger value="daily" className="text-xs">Daily Sales</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="orders">
          {isLoading ? <LoadingState /> : filteredOrders.length === 0 ? (
            <EmptyState icon={ShoppingBag} message="No orders found for the selected date range" />
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <ExportButtons
                  title="Order-wise Sales Report"
                  filename="order-wise-report"
                  headers={["Order ID", "Customer", "Items", "Amount", "Status", "Date"]}
                  rows={filteredOrders.map((o: any) => [
                    formatOrderId({ id: String(o.id), orderNumber: o.orderNumber, displayId: o.displayId }),
                    o.customerName || "Unknown",
                    String(parseItems(o).reduce((s: number, i: any) => s + (i.quantity || 1), 0)),
                    String(parseFloat(o.total || "0").toFixed(2)),
                    o.status || "unknown",
                    o.createdAt ? format(new Date(o.createdAt), "dd/MM/yyyy") : "-",
                  ])}
                />
              </div>
              <Card className="bg-white dark:bg-gray-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Order ID</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Items</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.slice(0, 100).map((order: any) => {
                        const itemCount = parseItems(order).reduce((s: number, i: any) => s + (i.quantity || 1), 0);
                        return (
                          <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {formatOrderId({ id: String(order.id), orderNumber: order.orderNumber, displayId: order.displayId })}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{order.customerName || "Unknown"}</td>
                            <td className="px-4 py-3 text-sm text-right">{itemCount}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{formatINR(parseFloat(order.total || "0"))}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {order.createdAt ? format(new Date(order.createdAt), "dd/MM/yyyy") : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredOrders.length > 100 && (
                  <div className="p-3 text-center text-sm text-gray-500 border-t">
                    Showing 100 of {filteredOrders.length} orders
                  </div>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="items">
          {isLoading ? <LoadingState /> : itemWiseData.length === 0 ? (
            <EmptyState icon={Package} message="No item data available" />
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <ExportButtons
                  title="Item-wise Sales Report"
                  filename="item-wise-report"
                  headers={["Product Name", "Segment", "Qty Sold", "Unit Price", "Total Revenue"]}
                  rows={itemWiseData.map(i => [
                    i.name, i.segment || "-", String(i.qty),
                    String(i.unitPrice.toFixed(2)), String(i.revenue.toFixed(2)),
                  ])}
                />
              </div>
              <Card className="bg-white dark:bg-gray-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Product Name</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Segment</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemWiseData.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{item.segment || "-"}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{item.qty}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatINR(item.unitPrice)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{formatINR(item.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                        <td className="px-4 py-3 text-sm" colSpan={2}>Total</td>
                        <td className="px-4 py-3 text-sm text-right">{itemWiseData.reduce((s, i) => s + i.qty, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right"></td>
                        <td className="px-4 py-3 text-sm text-right text-green-600">{formatINR(itemWiseData.reduce((s, i) => s + i.revenue, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="segments">
          {isLoading ? <LoadingState /> : segmentWiseData.length === 0 ? (
            <EmptyState icon={BarChart3} message="No segment data available" />
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <ExportButtons
                  title="Segment-wise Sales Report"
                  filename="segment-wise-report"
                  headers={["Segment", "Orders", "Items Qty", "Revenue"]}
                  rows={segmentWiseData.map(s => [
                    s.segment, String(s.ordersCount), String(s.items), String(s.revenue.toFixed(2)),
                  ])}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {segmentWiseData.map((seg) => (
                  <Card key={seg.segment} className="bg-white dark:bg-gray-900">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{seg.segment}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Orders</span>
                          <span className="font-medium">{seg.ordersCount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Items Qty</span>
                          <span className="font-medium">{seg.items}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Revenue</span>
                          <span className="font-medium text-green-600">{formatINR(seg.revenue)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="bg-white dark:bg-gray-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Segment</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Items Qty</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segmentWiseData.map((seg, idx) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{seg.segment}</td>
                          <td className="px-4 py-3 text-sm text-right">{seg.ordersCount}</td>
                          <td className="px-4 py-3 text-sm text-right">{seg.items}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{formatINR(seg.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                        <td className="px-4 py-3 text-sm">Total</td>
                        <td className="px-4 py-3 text-sm text-right">{segmentWiseData.reduce((s, seg) => s + seg.ordersCount, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right">{segmentWiseData.reduce((s, seg) => s + seg.items, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600">{formatINR(segmentWiseData.reduce((s, seg) => s + seg.revenue, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="agents">
          {isLoading ? <LoadingState /> : (agentWiseData.b2b.length === 0 && agentWiseData.b2c.length === 0) ? (
            <EmptyState icon={Users} message="No customer data available" />
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <ExportButtons
                  title="Agent / Customer-wise Report"
                  filename="agent-customer-report"
                  headers={["Customer Name", "Type", "Role", "Orders", "Total Revenue"]}
                  rows={[
                    ...agentWiseData.b2b.map(a => [a.name, "B2B", a.role, String(a.orders), String(a.revenue.toFixed(2))]),
                    ...agentWiseData.b2c.map(a => [a.name, "B2C", a.role, String(a.orders), String(a.revenue.toFixed(2))]),
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <Card className="bg-white dark:bg-gray-900">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{agentWiseData.b2b.length}</p>
                    <p className="text-xs text-gray-500">B2B Customers</p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatINR(agentWiseData.b2b.reduce((s, a) => s + a.revenue, 0))}</p>
                    <p className="text-xs text-gray-500">B2B Revenue</p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{agentWiseData.b2c.length}</p>
                    <p className="text-xs text-gray-500">B2C Customers</p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-900">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{formatINR(agentWiseData.b2c.reduce((s, a) => s + a.revenue, 0))}</p>
                    <p className="text-xs text-gray-500">B2C Revenue</p>
                  </CardContent>
                </Card>
              </div>

              {agentWiseData.b2b.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-800">B2B</Badge> Business Customers
                  </h3>
                  <Card className="bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentWiseData.b2b.map((agent, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{agent.name}</td>
                              <td className="px-4 py-3 text-sm"><Badge variant="outline">{agent.role}</Badge></td>
                              <td className="px-4 py-3 text-sm text-right">{agent.orders}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{formatINR(agent.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {agentWiseData.b2c.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">B2C</Badge> Individual Customers
                  </h3>
                  <Card className="bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentWiseData.b2c.slice(0, 50).map((customer, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{customer.name}</td>
                              <td className="px-4 py-3 text-sm text-right">{customer.orders}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{formatINR(customer.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {agentWiseData.b2c.length > 50 && (
                      <div className="p-3 text-center text-sm text-gray-500 border-t">
                        Showing 50 of {agentWiseData.b2c.length} customers
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="status">
          {isLoading ? <LoadingState /> : statusWiseData.length === 0 ? (
            <EmptyState icon={Clock} message="No status data available" />
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <ExportButtons
                  title="Status-wise Pending Report"
                  filename="status-wise-report"
                  headers={["Status", "Count", "Value", "% of Total", "Needs Action"]}
                  rows={statusWiseData.map(s => [
                    s.status,
                    String(s.count),
                    String(s.value.toFixed(2)),
                    `${((s.count / (filteredOrders.length || 1)) * 100).toFixed(1)}%`,
                    needsAction(s.status) ? "YES" : "No",
                  ])}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {statusWiseData.map((item) => (
                  <Card key={item.status} className={`bg-white dark:bg-gray-900 ${needsAction(item.status) ? "ring-2 ring-amber-400" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                        {needsAction(item.status) && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">Action Needed</Badge>
                        )}
                      </div>
                      <div className="flex items-end justify-between mt-3">
                        <div>
                          <p className="text-3xl font-bold text-gray-900 dark:text-white">{item.count}</p>
                          <p className="text-xs text-gray-500">orders</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{formatINR(item.value)}</p>
                          <p className="text-xs text-gray-500">{((item.count / (filteredOrders.length || 1)) * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${needsAction(item.status) ? "bg-amber-500" : "bg-purple-500"}`}
                          style={{ width: `${Math.min(100, (item.count / (filteredOrders.length || 1)) * 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="daily">
          {isLoading ? <LoadingState /> : dailySalesData.length === 0 ? (
            <EmptyState icon={BarChart3} message="No daily data for the selected period" />
          ) : (
            <>
              <div className="flex justify-end mb-3">
                <ExportButtons
                  title="Daily Sales Report"
                  filename="daily-sales-report"
                  headers={["Date", "Order Count", "Delivered", "Cancelled", "Revenue"]}
                  rows={dailySalesData.map(d => [
                    d.date !== "Unknown" ? format(new Date(d.date), "dd/MM/yyyy") : "Unknown",
                    String(d.orders), String(d.delivered), String(d.cancelled),
                    String(d.revenue.toFixed(2)),
                  ])}
                />
              </div>
              <Card className="bg-white dark:bg-gray-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Orders</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Delivered</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cancelled</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySalesData.map((day) => (
                        <tr key={day.date} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {day.date !== "Unknown" ? format(new Date(day.date), "dd MMM yyyy") : "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">{day.orders}</td>
                          <td className="px-4 py-3 text-sm text-right text-green-600">{day.delivered}</td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">{day.cancelled}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{formatINR(day.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                        <td className="px-4 py-3 text-sm">Total</td>
                        <td className="px-4 py-3 text-sm text-right">{dailySalesData.reduce((s, d) => s + d.orders, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600">{dailySalesData.reduce((s, d) => s + d.delivered, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">{dailySalesData.reduce((s, d) => s + d.cancelled, 0)}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatINR(dailySalesData.reduce((s, d) => s + d.revenue, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function MerchantReports() {
  return (
    <MerchantLayout>
      <ReportsContent />
    </MerchantLayout>
  );
}