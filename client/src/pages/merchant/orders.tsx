import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RefreshCw, Search, ShoppingBag, CalendarIcon, CheckCircle2, XCircle, ArrowRight, CheckCheck, Megaphone, Truck, Eye, Printer, Filter, ArrowRightLeft } from "lucide-react";
import { formatOrderId } from "@/lib/format-order-id";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface Order {
  id: number;
  orderId?: string;
  orderNumber?: number;
  displayId?: string;
  customerName?: string;
  customer?: string;
  amount?: number;
  totalAmount?: number;
  total?: number;
  status: string;
  createdAt?: string;
  date?: string;
  agentId?: string;
  agentName?: string;
  productSegment?: string;
  paymentStatus?: string;
  pricingRole?: string;
}

const STATUS_TABS = [
  { value: "all", label: "All Orders" },
  { value: "new", label: "New" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "marketing_approved", label: "Mktg Approved" },
  { value: "assigned_to_delivery", label: "Assigned Delivery" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const TARGET_STATUSES = [
  { value: "accepted", label: "Accepted" },
  { value: "marketing_approved", label: "Marketing Approved" },
  { value: "assigned_to_delivery", label: "Assigned to Delivery" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const WORKFLOW_NEXT_STEP: Record<string, { label: string; nextStatus: string; icon: "accept" | "mktg" | "delivery" }> = {
  pending: { label: "Accept", nextStatus: "accepted", icon: "accept" },
  accepted: { label: "Mktg Approve", nextStatus: "marketing_approved", icon: "mktg" },
  marketing_approved: { label: "Assign Delivery", nextStatus: "assigned_to_delivery", icon: "delivery" },
};

function getStatusBadgeVariant(status: string) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "processing":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "ready":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "new":
    case "pending":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    case "accepted":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
    case "marketing_approved":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case "confirmed":
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case "assigned_to_delivery":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
  }
}

function getOrderDisplayId(order: Order): string {
  return formatOrderId({
    id: String(order.id),
    orderNumber: order.orderNumber,
    displayId: order.displayId,
  });
}

function getCustomerName(order: Order): string {
  return order.customerName || order.customer || "Unknown";
}

function getAmount(order: Order): number {
  return order.amount || order.totalAmount || order.total || 0;
}

function getDate(order: Order): string {
  const raw = order.createdAt || order.date;
  if (!raw) return "-";
  try {
    return new Date(raw).toLocaleDateString("en-IN");
  } catch {
    return "-";
  }
}

function getOrderDate(order: Order): Date | null {
  const raw = order.createdAt || order.date;
  if (!raw) return null;
  try {
    return new Date(raw);
  } catch {
    return null;
  }
}

function WorkflowActionIcon({ type }: { type: "accept" | "mktg" | "delivery" }) {
  switch (type) {
    case "accept": return <CheckCircle2 className="h-3.5 w-3.5 mr-1" />;
    case "mktg": return <Megaphone className="h-3.5 w-3.5 mr-1" />;
    case "delivery": return <Truck className="h-3.5 w-3.5 mr-1" />;
  }
}

function OrdersContent() {
  const { merchantId } = useMerchantContext();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const initialStatus = urlParams.get("status") || "all";
  const [activeTab, setActiveTab] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [targetStatus, setTargetStatus] = useState("accepted");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [filterSegment, setFilterSegment] = useState("all");
  const [filterAgentType, setFilterAgentType] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterRoute, setFilterRoute] = useState("all");
  const [reassignOrder, setReassignOrder] = useState<Order | null>(null);
  const [reassignAgentId, setReassignAgentId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status");
    if (s && STATUS_TABS.some(t => t.value === s)) {
      setActiveTab(s);
    }
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery<Order[]>({
    queryKey: ["/api/orders", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/orders?merchantId=${merchantId}`, { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.orders || json.data || [];
    },
    enabled: !!merchantId,
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async ({ orderIds, status }: { orderIds: number[]; status: string }) => {
      const res = await apiRequest("POST", `/api/union/${merchantId}/orders/bulk-approve`, {
        orderIds,
        targetStatus: status,
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast({
        title: "Orders Updated",
        description: `${variables.orderIds.length} order(s) updated to "${variables.status}"`,
      });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/api/orders", merchantId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update orders",
        variant: "destructive",
      });
    },
  });

  const singleStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/union/${merchantId}/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast({
        title: "Order Updated",
        description: `Order advanced to "${variables.status}"`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders", merchantId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    },
  });

  const { data: routeAgents = [] } = useQuery<any[]>({
    queryKey: ["/api/merchant/route-agents"],
  });

  const reassignMutation = useMutation({
    mutationFn: async () => {
      const agent = routeAgents.find((a: any) => a.id === reassignAgentId);
      if (!agent) throw new Error("Agent not found");
      const res = await apiRequest("POST",
        `/api/mmo/routes/${agent.routeId}/assign-order`,
        { orderId: reassignOrder?.id, agentId: agent.id }
      );
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", merchantId] });
      toast({ title: data.message || "Order reassigned successfully" });
      setReassignOrder(null);
      setReassignAgentId("");
    },
    onError: (e: Error) => toast({ title: "Reassign failed", description: e.message, variant: "destructive" }),
  });

  const orders = data || [];

  const uniqueAgentTypes = useMemo(() => {
    const types = new Set<string>();
    for (const o of orders) {
      if (o.pricingRole) types.add(o.pricingRole);
    }
    return Array.from(types).sort();
  }, [orders]);

  const uniqueRoutes = useMemo(() => {
    const routes = new Set<string>();
    for (const o of orders) {
      if (o.agentId) routes.add(o.agentId);
    }
    return Array.from(routes).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (activeTab !== "all") {
      result = result.filter((o) => o.status?.toLowerCase() === activeTab);
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((o) => {
        const d = getOrderDate(o);
        return d && d >= start;
      });
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((o) => {
        const d = getOrderDate(o);
        return d && d <= end;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          getOrderDisplayId(o).toLowerCase().includes(q) ||
          getCustomerName(o).toLowerCase().includes(q) ||
          (o.agentId || '').toLowerCase().includes(q)
      );
    }

    if (filterSegment !== "all") {
      result = result.filter((o) => (o.productSegment || '').toLowerCase() === filterSegment.toLowerCase());
    }

    if (filterAgentType !== "all") {
      result = result.filter((o) => o.pricingRole === filterAgentType);
    }

    if (filterPaymentStatus !== "all") {
      result = result.filter((o) => {
        const ps = (o.paymentStatus || 'unpaid').toLowerCase();
        if (filterPaymentStatus === "paid") return ps === "paid" || ps === "completed";
        return ps !== "paid" && ps !== "completed";
      });
    }

    if (filterRoute !== "all") {
      result = result.filter((o) => o.agentId === filterRoute);
    }

    return result;
  }, [orders, activeTab, searchQuery, startDate, endDate, filterSegment, filterAgentType, filterPaymentStatus, filterRoute]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const o of orders) {
      const s = o.status?.toLowerCase() || "unknown";
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [orders]);

  const pendingCount = statusCounts["pending"] || 0;
  const acceptedCount = statusCounts["accepted"] || 0;

  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkAction(status: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkApproveMutation.mutate({ orderIds: ids, status });
  }

  function handleBulkAcceptAllPending() {
    const pendingIds = orders.filter(o => o.status?.toLowerCase() === "pending").map(o => o.id);
    if (pendingIds.length === 0) {
      toast({ title: "No Pending Orders", description: "There are no pending orders to accept." });
      return;
    }
    bulkApproveMutation.mutate({ orderIds: pendingIds, status: "accepted" });
  }

  function handleBulkMarketingApproveAll() {
    const acceptedIds = orders.filter(o => o.status?.toLowerCase() === "accepted").map(o => o.id);
    if (acceptedIds.length === 0) {
      toast({ title: "No Accepted Orders", description: "There are no accepted orders to approve." });
      return;
    }
    bulkApproveMutation.mutate({ orderIds: acceptedIds, status: "marketing_approved" });
  }

  function handleSingleAdvance(order: Order) {
    const step = WORKFLOW_NEXT_STEP[order.status?.toLowerCase()];
    if (!step) return;
    singleStatusMutation.mutate({ orderId: order.id, status: step.nextStatus });
  }

  function clearDateFilters() {
    setStartDate(undefined);
    setEndDate(undefined);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage all union orders</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by Order ID or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            <Button variant="ghost" size="sm" onClick={clearDateFilters} className="text-xs text-red-500">
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end flex-wrap bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="min-w-[130px]">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Segment</label>
            <Select value={filterSegment} onValueChange={setFilterSegment}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
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
          <div className="min-w-[130px]">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Agent Type</label>
            <Select value={filterAgentType} onValueChange={setFilterAgentType}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueAgentTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[130px]">
            <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Payment</label>
            <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {uniqueRoutes.length > 0 && (
            <div className="min-w-[140px]">
              <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">Agent Code</label>
              <Select value={filterRoute} onValueChange={setFilterRoute}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {uniqueRoutes.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            {isFetching ? "Fetching..." : "Fetch"}
          </Button>
          {(filterSegment !== "all" || filterAgentType !== "all" || filterPaymentStatus !== "all" || filterRoute !== "all") && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-8 text-red-500"
              onClick={() => { setFilterSegment("all"); setFilterAgentType("all"); setFilterPaymentStatus("all"); setFilterRoute("all"); }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-xs border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
          onClick={handleBulkAcceptAllPending}
          disabled={bulkApproveMutation.isPending || pendingCount === 0}
        >
          <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
          Accept All Pending ({pendingCount})
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950"
          onClick={handleBulkMarketingApproveAll}
          disabled={bulkApproveMutation.isPending || acceptedCount === 0}
        >
          <Megaphone className="h-3.5 w-3.5 mr-1.5" />
          Marketing Approve All ({acceptedCount})
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {selectedIds.size} order(s) selected
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="default"
              className="bg-green-600 hover:bg-green-700 text-white text-xs"
              onClick={() => handleBulkAction("accepted")}
              disabled={bulkApproveMutation.isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Approve Selected
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs"
              onClick={() => handleBulkAction("cancelled")}
              disabled={bulkApproveMutation.isPending}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject Selected
            </Button>
            <div className="flex items-center gap-1.5">
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="Target Status" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => handleBulkAction(targetStatus)}
                disabled={bulkApproveMutation.isPending}
              >
                Apply
              </Button>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds(new Set()); }}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label}
              {statusCounts[tab.value] !== undefined && (
                <span className="ml-1.5 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {statusCounts[tab.value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <ShoppingBag className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-lg font-medium">No orders found</p>
                <p className="text-sm">
                  {searchQuery ? "Try a different search term" : "Orders will appear here when placed"}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block">
                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                          <th className="px-3 py-3 w-10">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={toggleSelectAll}
                              aria-label="Select all"
                            />
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order ID</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Agent Code</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount (₹)</th>
                          <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                          <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((order) => {
                          const nextStep = WORKFLOW_NEXT_STEP[order.status?.toLowerCase()];
                          return (
                            <tr
                              key={order.id}
                              className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 ${selectedIds.has(order.id) ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                            >
                              <td className="px-3 py-3">
                                <Checkbox
                                  checked={selectedIds.has(order.id)}
                                  onCheckedChange={() => toggleSelect(order.id)}
                                  aria-label={`Select order ${order.id}`}
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{getOrderDisplayId(order)}</td>
                              <td className="px-4 py-3 text-xs text-purple-700 dark:text-purple-300 font-mono">{order.agentId || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{getCustomerName(order)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-medium">₹{getAmount(order).toLocaleString("en-IN")}</td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{getDate(order)}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 w-7 p-0"
                                    title="View Order"
                                    onClick={() => navigate(`/merchant/orders/view/${order.id}`)}
                                  >
                                    <Eye className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 w-7 p-0"
                                    title="Print Invoice"
                                    onClick={() => navigate(`/merchant/orders/view/${order.id}?print=1`)}
                                  >
                                    <Printer className="h-4 w-4 text-gray-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs h-7 w-7 p-0"
                                    title="Reassign Agent"
                                    onClick={() => { setReassignOrder(order); setReassignAgentId(order.agentId || ""); }}
                                  >
                                    <ArrowRightLeft className="h-4 w-4 text-orange-600" />
                                  </Button>
                                  {nextStep && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs h-7"
                                      onClick={() => handleSingleAdvance(order)}
                                      disabled={singleStatusMutation.isPending}
                                    >
                                      <WorkflowActionIcon type={nextStep.icon} />
                                      {nextStep.label}
                                      <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="md:hidden space-y-3">
                  {filteredOrders.map((order) => {
                    const nextStep = WORKFLOW_NEXT_STEP[order.status?.toLowerCase()];
                    return (
                      <div
                        key={order.id}
                        className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-2 ${selectedIds.has(order.id) ? "ring-2 ring-blue-400" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedIds.has(order.id)}
                            onCheckedChange={() => toggleSelect(order.id)}
                            aria-label={`Select order ${order.id}`}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{getOrderDisplayId(order)}</span>
                            <Badge className={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-8">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{getCustomerName(order)}</span>
                          {order.agentId && (
                            <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">{order.agentId}</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between pl-8">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{getAmount(order).toLocaleString("en-IN")}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{getDate(order)}</span>
                        </div>
                        <div className="flex items-center gap-2 pl-8 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 flex-1"
                            onClick={() => navigate(`/merchant/orders/view/${order.id}`)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 flex-1"
                            onClick={() => navigate(`/merchant/orders/view/${order.id}?print=1`)}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1" />
                            Print
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 flex-1"
                            onClick={() => { setReassignOrder(order); setReassignAgentId(order.agentId || ""); }}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                            Reassign
                          </Button>
                        </div>
                        {nextStep && (
                          <div className="pl-8 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 w-full"
                              onClick={() => handleSingleAdvance(order)}
                              disabled={singleStatusMutation.isPending}
                            >
                              <WorkflowActionIcon type={nextStep.icon} />
                              {nextStep.label}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!reassignOrder} onOpenChange={(open) => { if (!open) { setReassignOrder(null); setReassignAgentId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Order Agent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Order <strong>#{reassignOrder ? getOrderDisplayId(reassignOrder) : ''}</strong> — currently assigned to{" "}
              <strong>{reassignOrder?.agentName || reassignOrder?.agentId || "Unassigned"}</strong>
            </p>
            <div>
              <Label>Assign to Agent</Label>
              <Select value={reassignAgentId} onValueChange={setReassignAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  {routeAgents.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.agentCode} — {a.agentName} ({a.routeName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReassignOrder(null); setReassignAgentId(""); }}>Cancel</Button>
            <Button onClick={() => reassignMutation.mutate()} disabled={!reassignAgentId || reassignMutation.isPending}>
              {reassignMutation.isPending ? "Saving..." : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MerchantOrdersPage() {
  return (
    <MerchantLayout>
      <OrdersContent />
    </MerchantLayout>
  );
}
