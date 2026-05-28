import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Package, IceCream2, ShoppingBag, Route, MapPin, Users, ChevronDown, ChevronUp, Plus, Truck } from "lucide-react";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";

interface HeadOfficeRecord {
  id: string;
  officeName: string;
  officeCode: string;
}

interface HeadOfficeOrder {
  id: string;
  displayId: string | null;
  customerName: string;
  customerPhone: string;
  productSegment: string;
  pricingRole: string;
  total: string;
  status: string;
  items: any;
  deliveryShift: string | null;
  deliveryAddress: string;
  agentId: string | null;
  agentName: string | null;
  createdAt: string;
}

interface MmoRoute {
  id: string;
  routeName: string;
  routeCode: string;
  areaDescription: string | null;
}

interface MmoAgent {
  id: string;
  routeId: string;
  agentCode: string;
  agentName: string;
  pointName: string;
  segment: string;
  mobileNo: string | null;
}

function formatOrderId(displayId: string | null, id: string): string {
  if (displayId) return `ORD-${displayId}`;
  return `ORD-${id.slice(-8).toUpperCase()}`;
}

function segmentBadge(segment: string) {
  if (segment === "Products") return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"><Package className="h-3 w-3 mr-1" />Products</Badge>;
  if (segment === "Ice Cream") return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"><IceCream2 className="h-3 w-3 mr-1" />Ice Cream</Badge>;
  return <Badge variant="secondary">{segment}</Badge>;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    preparing: "bg-orange-100 text-orange-700",
    ready: "bg-green-100 text-green-700",
    dispatched: "bg-indigo-100 text-indigo-700",
    delivered: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-700"}>{status}</Badge>;
}

export default function HeadOfficePage() {
  return (
    <MerchantLayout>
      <HeadOfficeContent />
    </MerchantLayout>
  );
}

function HeadOfficeContent() {
  const { toast } = useToast();
  const { staffSession } = useMerchantContext();
  const isFieldOps = staffSession?.isStaff && staffSession.accessTier === "field_ops";
  const [location, navigate] = useLocation();
  const urlTab = new URLSearchParams(location.split("?")[1] || "").get("tab");
  const [activeTab, setActiveTab] = useState(urlTab === "routes" ? "routes" : "orders");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignOrder, setAssignOrder] = useState<HeadOfficeOrder | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tab = new URLSearchParams(location.split("?")[1] || "").get("tab");
    setActiveTab(tab === "routes" ? "routes" : "orders");
  }, [location]);

  const { data: headOffice, isLoading: officeLoading } = useQuery<HeadOfficeRecord>({
    queryKey: ["/api/head-office"],
  });

  const queryParams = new URLSearchParams();
  if (segmentFilter !== "all") queryParams.set("segment", segmentFilter);
  if (statusFilter !== "all") queryParams.set("status", statusFilter);
  const qs = queryParams.toString();

  const { data: orders = [], isLoading: ordersLoading } = useQuery<HeadOfficeOrder[]>({
    queryKey: ["/api/head-office/orders", segmentFilter, statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/head-office/orders${qs ? `?${qs}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const { data: allOfficeRoutes = [] } = useQuery<MmoRoute[]>({
    queryKey: ["/api/mmo/offices", headOffice?.id, "routes"],
    queryFn: async () => {
      const res = await fetch(`/api/mmo/offices/${headOffice!.id}/routes`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch routes");
      return res.json();
    },
    enabled: !!headOffice?.id,
  });

  const { data: assignRouteAgents = [] } = useQuery<MmoAgent[]>({
    queryKey: ["/api/mmo/routes", selectedRouteId, "agents"],
    queryFn: async () => {
      const res = await fetch(`/api/mmo/routes/${selectedRouteId}/agents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
    enabled: !!selectedRouteId && assignDialogOpen,
  });

  const assignOrderMutation = useMutation({
    mutationFn: ({ routeId, orderId, agentId }: { routeId: string; orderId: string; agentId: string }) =>
      apiRequest("POST", `/api/mmo/routes/${routeId}/assign-order`, { orderId, agentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/head-office/orders"] });
      toast({ title: "Order assigned successfully" });
      closeAssignDialog();
    },
    onError: (err: Error) => toast({ title: "Assignment failed", description: err.message, variant: "destructive" }),
  });

  function openAssignDialog(order: HeadOfficeOrder, e: React.MouseEvent) {
    e.stopPropagation();
    setAssignOrder(order);
    setSelectedRouteId("");
    setSelectedAgentId("");
    setAssignDialogOpen(true);
  }

  function closeAssignDialog() {
    setAssignDialogOpen(false);
    setAssignOrder(null);
    setSelectedRouteId("");
    setSelectedAgentId("");
  }

  function handleAssignSubmit() {
    if (!assignOrder || !selectedRouteId || !selectedAgentId) {
      toast({ title: "Please select a route and agent", variant: "destructive" });
      return;
    }
    assignOrderMutation.mutate({ routeId: selectedRouteId, orderId: assignOrder.id, agentId: selectedAgentId });
  }

  function toggleRouteExpand(routeId: string) {
    setExpandedRoutes(prev => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  }

  if (officeLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const productOrders = orders.filter(o => o.productSegment === "Products");
  const iceCreamOrders = orders.filter(o => o.productSegment === "Ice Cream");

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-amber-600" />
          Head Office
        </h1>
        <p className="text-sm text-muted-foreground">
          Central dispatch hub for B2B Products and Ice Cream orders
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Total B2B Orders</p>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-indigo-700">{productOrders.length}</p>
            <p className="text-xs text-muted-foreground">Products</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{iceCreamOrders.length}</p>
            <p className="text-xs text-muted-foreground">Ice Cream</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{allOfficeRoutes.length}</p>
            <p className="text-xs text-muted-foreground">Routes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders" className="gap-1">
            <ShoppingBag className="h-4 w-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="routes" className="gap-1">
            <Route className="h-4 w-4" /> Routes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                <SelectItem value="Products">Products</SelectItem>
                <SelectItem value="Ice Cream">Ice Cream</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="preparing">Preparing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {ordersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h2 className="text-lg font-semibold mb-1">No B2B Orders</h2>
                <p className="text-sm text-muted-foreground">
                  No B2B Products or Ice Cream orders found matching your filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead className="w-[80px]">Date</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/merchant/orders/view/${order.id}`)}>
                      <TableCell className="font-mono text-xs">{formatOrderId(order.displayId, order.id)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{segmentBadge(order.productSegment)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{order.pricingRole}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{Number(order.total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>{statusBadge(order.status)}</TableCell>
                      <TableCell className="text-xs">
                        {order.agentName ? (
                          <span className="text-green-600 font-medium">{order.agentName}</span>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </TableCell>
                      <TableCell>
                        {!order.agentId ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 text-xs gap-1"
                            onClick={(e) => openAssignDialog(order, e)}
                          >
                            <Truck className="h-3 w-3" /> Dispatch
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">Assigned</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="routes" className="space-y-4 mt-4">
          {!headOffice?.id ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Loading Head Office...</CardContent></Card>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-muted-foreground">
                  Routes and agents for B2B Products and Ice Cream dispatch.
                </p>
                {!isFieldOps && (
                  <Button onClick={() => navigate(`/merchant/mmo/${headOffice.id}/routes`)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Routes & Agents
                  </Button>
                )}
              </div>

              {allOfficeRoutes.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Route className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h2 className="text-lg font-semibold mb-1">No Routes Yet</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create routes and add agents to start dispatching B2B orders from Head Office.
                    </p>
                    <Button onClick={() => navigate(`/merchant/mmo/${headOffice.id}/routes`)}>
                      <Route className="h-4 w-4 mr-2" /> Set Up Routes
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {allOfficeRoutes.map((route) => (
                    <RouteWithAgents
                      key={route.id}
                      route={route}
                      expanded={expandedRoutes.has(route.id)}
                      onToggle={() => toggleRouteExpand(route.id)}
                      headOfficeId={headOffice.id}
                      onManage={() => navigate(`/merchant/mmo/${headOffice.id}/routes`)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={assignDialogOpen} onOpenChange={v => !v && closeAssignDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dispatch Order</DialogTitle>
          </DialogHeader>
          {assignOrder && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                <p><span className="font-medium">Order:</span> {formatOrderId(assignOrder.displayId, assignOrder.id)}</p>
                <p><span className="font-medium">Customer:</span> {assignOrder.customerName}</p>
                <p><span className="font-medium">Segment:</span> {assignOrder.productSegment} ({assignOrder.pricingRole})</p>
                <p><span className="font-medium">Total:</span> ₹{Number(assignOrder.total).toLocaleString("en-IN")}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Select Route</label>
                <Select value={selectedRouteId} onValueChange={(v) => { setSelectedRouteId(v); setSelectedAgentId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a route..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allOfficeRoutes.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.routeName} ({r.routeCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRouteId && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Agent</label>
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assignRouteAgents.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.agentName} - {a.pointName} ({a.agentCode})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeAssignDialog}>Cancel</Button>
            <Button
              onClick={handleAssignSubmit}
              disabled={!selectedRouteId || !selectedAgentId || assignOrderMutation.isPending}
            >
              {assignOrderMutation.isPending ? "Assigning..." : "Assign to Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RouteWithAgents({
  route,
  expanded,
  onToggle,
  headOfficeId,
  onManage,
}: {
  route: MmoRoute;
  expanded: boolean;
  onToggle: () => void;
  headOfficeId: string;
  onManage: () => void;
}) {
  const { data: agents = [], isLoading } = useQuery<MmoAgent[]>({
    queryKey: ["/api/mmo/routes", route.id, "agents"],
    queryFn: async () => {
      const res = await fetch(`/api/mmo/routes/${route.id}/agents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
    enabled: expanded,
  });

  return (
    <Card className="border-l-4 border-l-amber-500">
      <CardContent className="p-0">
        <button
          className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3">
            <Route className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-sm">{route.routeName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] font-mono">{route.routeCode}</Badge>
                {route.areaDescription && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{route.areaDescription}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); onManage(); }}>
              Manage
            </Button>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t">
            {isLoading ? (
              <div className="py-3 space-y-2"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
            ) : agents.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground text-center">No agents assigned to this route yet.</p>
            ) : (
              <div className="mt-2 rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Code</TableHead>
                      <TableHead className="text-xs">Agent Name</TableHead>
                      <TableHead className="text-xs">Point</TableHead>
                      <TableHead className="text-xs">Segment</TableHead>
                      <TableHead className="text-xs">Mobile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map(agent => (
                      <TableRow key={agent.id}>
                        <TableCell className="text-xs font-mono">{agent.agentCode}</TableCell>
                        <TableCell className="text-sm font-medium">{agent.agentName}</TableCell>
                        <TableCell className="text-xs">{agent.pointName}</TableCell>
                        <TableCell className="text-xs">{segmentBadge(agent.segment)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{agent.mobileNo || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
