import React, { useState, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, Route, Edit, Trash2, Upload, Users, ChevronUp, Printer, Milk, Package, IceCream2, CalendarDays, ShoppingBag, Info, Download, Share2, CheckCircle2, XCircle, LayoutGrid, List, ChevronDown, Receipt, FileText } from "lucide-react";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";

interface MmoOffice { id: string; officeName: string; officeCode: string; }
interface MmoRoute { id: string; mmoOfficeId: string; routeName: string; routeCode: string; areaDescription: string | null; sequenceNo: number; }
interface MmoAgent { id: string; routeId: string; agentCode: string; agentName: string; pointName: string; segment: string; mobileNo: string | null; address: string | null; sequenceNo: number; }

interface SegAgentRow {
  agentId: string;
  agentCode: string;
  agentName: string;
  pointName: string;
  morning: Record<string, number>;
  evening: Record<string, number>;
  morningValue: number;
  eveningValue: number;
  totalValue: number;
  orderCount: number;
  ordersQty: number;
  subscriptionQty: number;
  freeMilkQty: number;
  totalQty: number;
}

interface SegData {
  products: string[];
  productPrices: Record<string, number>;
  agents: SegAgentRow[];
  totalOrders: number;
  totalValue: number;
  productTotals: Record<string, { morning: number; evening: number }>;
}

function shortProductName(name: string): string {
  const n = name.trim();
  const map: [RegExp, string][] = [
    [/premium.?full\s*cream\s*milk.?1\s*lit/i, 'FCM 1L'],
    [/premium.?full\s*cream\s*milk.?500/i, 'FCM 500'],
    [/delite\s*milk.?500/i, 'DLT 500'],
    [/standard\s*milk.?200/i, 'STD 200'],
    [/standard\s*milk.?500/i, 'STD 500'],
    [/standardised\s*milk.?500/i, 'STD 500'],
    [/butter\s*milk.?150/i, 'BTM 150'],
    [/butter\s*milk.?200/i, 'BTM 200'],
    [/butter\s*milk.?500/i, 'BTM 500'],
    [/butter\s*milk/i, 'BTM'],
    [/curd.?130/i, 'Curd 130g'],
    [/curd.?500/i, 'Curd 500g'],
    [/curd.?1\s*kg/i, 'Curd 1kg'],
    [/curd/i, 'Curd'],
    [/peda/i, 'Peda'],
    [/ghee.?200/i, 'Ghee 200'],
    [/ghee.?500/i, 'Ghee 500'],
    [/ghee/i, 'Ghee'],
    [/paneer/i, 'Paneer'],
    [/lassi/i, 'Lassi'],
    [/ice\s*cream/i, 'IC'],
  ];
  for (const [re, short] of map) {
    if (re.test(n)) return short;
  }
  let s = n.replace(/\(.*?\)/g, '').replace(/^aavin\s*/i, '').trim();
  if (s.length > 12) s = s.substring(0, 12).trim();
  return s;
}

function agentHasShiftOrders(a: SegAgentRow, shift: 'morning' | 'evening' | 'combined'): boolean {
  if (shift === 'combined') return a.orderCount > 0;
  const bucket = shift === 'morning' ? a.morning : a.evening;
  return Object.values(bucket).some(q => q > 0);
}

interface UnmatchedOrder {
  id: string;
  customerName: string;
  customerPhone?: string | null;
  total: number;
  productSegment: string;
  items: { name: string; quantity: number; price: number }[];
  createdAt: string;
  deliveryShift: string;
}

interface MatchedOrder extends UnmatchedOrder {
  currentAgentId: string | null;
  currentAgentCode: string | null;
  currentAgentName: string | null;
}

interface DispatchData {
  dispatchDate: string;
  orderDate: string;
  routeName: string;
  routeCode: string;
  agents: MmoAgent[];
  segments: Record<string, SegData>;
  matchedOrderCount: number;
  unmatchedOrderCount: number;
  unmatchedOrders: UnmatchedOrder[];
  matchedOrders?: MatchedOrder[];
  totalAllUnionOrders: number;
  summary: { totalOrders: number; totalValue: number; totalFreeMilkQty?: number };
}

function getTomorrowDate(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

interface CollectionSummary {
  totalAmount: number;
  cashCount: number;
  onlineCount: number;
  byMode: Record<string, { count: number; amount: number }>;
}

function RouteCollectionBadge({ routeId, date }: { routeId: string; date: string }) {
  const { data, isLoading, isError } = useQuery<CollectionSummary>({
    queryKey: ["/api/mmo/routes", routeId, "collection-summary", date],
    queryFn: async () => {
      const res = await fetch(`/api/mmo/routes/${routeId}/collection-summary?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) return <div className="mt-2 h-5 w-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />;
  if (isError) return <div className="mt-2 text-[10px] text-muted-foreground italic">Collection data unavailable</div>;
  if (!data || data.totalAmount === 0) return null;

  const total = data.totalAmount;
  const cash = data.cashCount;
  const online = data.onlineCount;
  const parts: string[] = [];
  if (cash > 0) parts.push(`${cash} Cash`);
  if (online > 0) parts.push(`${online} Online`);

  return (
    <div className="mt-2">
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-[10px] font-medium gap-1 px-2 py-0.5">
        ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        {parts.length > 0 && <span className="opacity-70">— {parts.join(" / ")}</span>}
      </Badge>
    </div>
  );
}

export default function MmoRoutesPage() {
  return (
    <MerchantLayout>
      <MmoRoutesContent />
    </MerchantLayout>
  );
}

function MmoRoutesContent() {
  const { toast } = useToast();
  const { staffSession } = useMerchantContext();
  const isFieldOps = staffSession?.isStaff && staffSession.accessTier === "field_ops";
  const [, navigate] = useLocation();
  const params = useParams<{ officeId: string }>();
  const officeId = params.officeId;

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [dispatchDate, setDispatchDate] = useState(getTomorrowDate());
  const [routeViewMode, setRouteViewMode] = useState<'tile' | 'list'>('list');
  const [freshMilkShift, setFreshMilkShift] = useState<'combined' | 'morning' | 'evening'>('combined');
  const [activeSegTab, setActiveSegTab] = useState<string>('freshMilk');

  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [editRoute, setEditRoute] = useState<MmoRoute | null>(null);
  const [deleteRouteId, setDeleteRouteId] = useState<string | null>(null);
  const [routeForm, setRouteForm] = useState({ routeName: "", routeCode: "", areaDescription: "" });

  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<MmoAgent | null>(null);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [agentForm, setAgentForm] = useState({ agentCode: "", agentName: "", pointName: "", segment: "Fresh Milk", mobileNo: "", address: "" });

  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [unmatchedRouteSelection, setUnmatchedRouteSelection] = useState<Record<string, string>>({});
  const [unmatchedRouteAgents, setUnmatchedRouteAgents] = useState<Record<string, MmoAgent[]>>({});
  const [unmatchedAgentSelection, setUnmatchedAgentSelection] = useState<Record<string, string>>({});

  const [agentListDate, setAgentListDate] = useState(getTodayDate());
  const [agentListTab, setAgentListTab] = useState<'ordered' | 'unordered'>('ordered');
  const validAgentListDate = /^\d{4}-\d{2}-\d{2}$/.test(agentListDate) ? agentListDate : getTodayDate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkRouteId, setBulkRouteId] = useState<string | null>(null);

  const { data: offices = [] } = useQuery<MmoOffice[]>({ queryKey: ["/api/mmo/offices"] });
  const { data: headOffice } = useQuery<MmoOffice>({
    queryKey: ["/api/head-office"],
    enabled: !!officeId && !offices.find(o => o.id === officeId),
  });
  const office = offices.find(o => o.id === officeId) || (headOffice?.id === officeId ? headOffice : undefined);

  const { data: routes = [], isLoading: routesLoading } = useQuery<MmoRoute[]>({
    queryKey: ["/api/mmo/offices", officeId, "routes"],
    queryFn: async () => { const res = await fetch(`/api/mmo/offices/${officeId}/routes`, { credentials: "include" }); return res.json(); },
    enabled: !!officeId,
  });

  const selectedRoute = routes.find(r => r.id === selectedRouteId);

  const { data: agents = [] } = useQuery<MmoAgent[]>({
    queryKey: ["/api/mmo/routes", selectedRouteId, "agents"],
    queryFn: async () => { const res = await fetch(`/api/mmo/routes/${selectedRouteId}/agents`, { credentials: "include" }); return res.json(); },
    enabled: !!selectedRouteId,
  });

  const { data: dispatchData, isLoading: dispatchLoading } = useQuery<DispatchData>({
    queryKey: ["/api/mmo/routes", selectedRouteId, "dispatch", dispatchDate],
    queryFn: async () => { const res = await fetch(`/api/mmo/routes/${selectedRouteId}/dispatch?date=${dispatchDate}`, { credentials: "include" }); return res.json(); },
    enabled: !!selectedRouteId,
  });

  const { data: agentDispatchData, isLoading: agentDispatchLoading } = useQuery<DispatchData>({
    queryKey: ["/api/mmo/routes", selectedRouteId, "dispatch", validAgentListDate, "agent-tab"],
    queryFn: async () => { const res = await fetch(`/api/mmo/routes/${selectedRouteId}/dispatch?date=${validAgentListDate}`, { credentials: "include" }); return res.json(); },
    enabled: !!selectedRouteId,
  });

  const { orderedAgents, unorderedAgents } = useMemo(() => {
    if (!agents.length) return { orderedAgents: [] as (MmoAgent & { orderCount: number; totalValue: number })[], unorderedAgents: [] as MmoAgent[] };

    const orderedAgentIds = new Set<string>();
    const agentOrderInfo = new Map<string, { orderCount: number; totalValue: number }>();

    if (agentDispatchData?.segments) {
      for (const segData of Object.values(agentDispatchData.segments)) {
        if (!segData?.agents) continue;
        for (const sa of segData.agents) {
          if (sa.orderCount > 0) {
            orderedAgentIds.add(sa.agentId);
            const existing = agentOrderInfo.get(sa.agentId) || { orderCount: 0, totalValue: 0 };
            agentOrderInfo.set(sa.agentId, {
              orderCount: existing.orderCount + sa.orderCount,
              totalValue: existing.totalValue + sa.totalValue,
            });
          }
        }
      }
    }

    const ordered = agents
      .filter(a => orderedAgentIds.has(a.id))
      .map(a => ({ ...a, ...(agentOrderInfo.get(a.id) || { orderCount: 0, totalValue: 0 }) }));
    const unordered = agents.filter(a => !orderedAgentIds.has(a.id));

    return { orderedAgents: ordered, unorderedAgents: unordered };
  }, [agents, agentDispatchData]);

  const unmatchedPhoneSuggestions = useMemo(() => {
    if (!dispatchData?.unmatchedOrders || !dispatchData?.agents) return {} as Record<string, string>;
    const suggestions: Record<string, string> = {};
    for (const o of dispatchData.unmatchedOrders) {
      if (!o.customerPhone) continue;
      const phoneDigits = o.customerPhone.replace(/\D/g, '').slice(-10);
      if (!phoneDigits) continue;
      const matched = dispatchData.agents.find(a => {
        const aDigits = (a.mobileNo || '').replace(/\D/g, '').slice(-10);
        return aDigits && aDigits === phoneDigits;
      });
      if (matched) suggestions[String(o.id)] = matched.id;
    }
    return suggestions;
  }, [dispatchData?.unmatchedOrders, dispatchData?.agents]);

  const createRouteMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/mmo/routes", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/offices", officeId, "routes"] }); toast({ title: "Route created" }); closeRouteDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const updateRouteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/mmo/routes/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/offices", officeId, "routes"] }); toast({ title: "Route updated" }); closeRouteDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const deleteRouteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/mmo/routes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/offices", officeId, "routes"] }); toast({ title: "Route removed" }); setDeleteRouteId(null); if (selectedRouteId === deleteRouteId) setSelectedRouteId(null); },
  });
  const createAgentMutation = useMutation({
    mutationFn: ({ routeId, data }: { routeId: string; data: any }) => apiRequest("POST", `/api/mmo/routes/${routeId}/agents`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/routes", selectedRouteId, "agents"] }); toast({ title: "Agent added" }); closeAgentDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const updateAgentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/mmo/agents/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/routes", selectedRouteId, "agents"] }); toast({ title: "Agent updated" }); closeAgentDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });
  const deleteAgentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/mmo/agents/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/routes", selectedRouteId, "agents"] }); toast({ title: "Agent removed" }); setDeleteAgentId(null); },
  });
  const bulkUploadMutation = useMutation({
    mutationFn: ({ routeId, agentsList }: { routeId: string; agentsList: any[] }) =>
      apiRequest("POST", `/api/mmo/routes/${routeId}/agents/bulk`, { agents: agentsList, mmoOfficeId: officeId }),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/routes", vars.routeId, "agents"] }); toast({ title: "Agents uploaded" }); },
    onError: (err: Error) => toast({ title: "Upload Error", description: err.message, variant: "destructive" }),
  });
  const assignOrderMutation = useMutation({
    mutationFn: ({ routeId, orderId, agentId }: { routeId: string; orderId: string; agentId: string }) =>
      apiRequest("POST", `/api/mmo/routes/${routeId}/assign-order`, { orderId, agentId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mmo/routes", selectedRouteId, "dispatch", dispatchDate] });
      if (variables.routeId !== selectedRouteId) {
        queryClient.invalidateQueries({ queryKey: ["/api/mmo/routes", variables.routeId, "dispatch", dispatchDate] });
      }
      setUnmatchedRouteSelection(prev => { const n = { ...prev }; delete n[variables.orderId]; return n; });
      toast({ title: "Order assigned successfully" });
    },
    onError: (err: Error) => toast({ title: "Assignment failed", description: err.message, variant: "destructive" }),
  });

  async function handleUnmatchedRouteChange(orderId: string, routeId: string) {
    setUnmatchedRouteSelection(prev => ({ ...prev, [orderId]: routeId }));
    if (routeId === selectedRouteId) {
      setUnmatchedRouteAgents(prev => ({ ...prev, [routeId]: agents }));
      return;
    }
    if (unmatchedRouteAgents[routeId]) return;
    try {
      const res = await fetch(`/api/mmo/routes/${routeId}/agents`, { credentials: "include" });
      const data = await res.json();
      setUnmatchedRouteAgents(prev => ({ ...prev, [routeId]: data }));
    } catch {}
  }

  function closeRouteDialog() { setRouteDialogOpen(false); setEditRoute(null); setRouteForm({ routeName: "", routeCode: "", areaDescription: "" }); }
  function openCreateRoute() { setEditRoute(null); setRouteForm({ routeName: "", routeCode: "", areaDescription: "" }); setRouteDialogOpen(true); }
  function openEditRoute(route: MmoRoute) { setEditRoute(route); setRouteForm({ routeName: route.routeName, routeCode: route.routeCode, areaDescription: route.areaDescription || "" }); setRouteDialogOpen(true); }
  function handleRouteSubmit() {
    if (!routeForm.routeName || !routeForm.routeCode) { toast({ title: "Please fill Route Name and Code", variant: "destructive" }); return; }
    if (editRoute) updateRouteMutation.mutate({ id: editRoute.id, data: { ...routeForm, mmoOfficeId: officeId } });
    else createRouteMutation.mutate({ ...routeForm, mmoOfficeId: officeId });
  }

  function closeAgentDialog() { setAgentDialogOpen(false); setEditAgent(null); setAgentForm({ agentCode: "", agentName: "", pointName: "", segment: "Fresh Milk", mobileNo: "", address: "" }); }
  function openCreateAgent() { setEditAgent(null); setAgentForm({ agentCode: "", agentName: "", pointName: "", segment: "Fresh Milk", mobileNo: "", address: "" }); setAgentDialogOpen(true); }
  function openEditAgent(agent: MmoAgent) { setEditAgent(agent); setAgentForm({ agentCode: agent.agentCode, agentName: agent.agentName, pointName: agent.pointName, segment: agent.segment, mobileNo: agent.mobileNo || "", address: agent.address || "" }); setAgentDialogOpen(true); }
  function handleAgentSubmit() {
    if (!agentForm.agentName || !agentForm.pointName) { toast({ title: "Please fill Agent Name and Point Name", variant: "destructive" }); return; }
    if (editAgent) updateAgentMutation.mutate({ id: editAgent.id, data: { ...agentForm, mmoOfficeId: officeId } });
    else if (selectedRouteId) createAgentMutation.mutate({ routeId: selectedRouteId, data: { ...agentForm, mmoOfficeId: officeId } });
  }

  function handleBulkUpload() { setBulkRouteId(selectedRouteId); fileInputRef.current?.click(); }
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bulkRouteId) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim());
        if (lines.length < 2) { toast({ title: "CSV must have header + data", variant: "destructive" }); return; }
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const parsed = lines.slice(1).map((line, idx) => {
          const cols = line.split(",").map(c => c.trim());
          const row: any = {};
          headers.forEach((h, i) => {
            if (["agentcode", "agent_code", "code"].includes(h)) row.agentCode = cols[i] || `AGT-${idx + 1}`;
            else if (["agentname", "agent_name", "name"].includes(h)) row.agentName = cols[i] || "";
            else if (["pointname", "point_name", "point"].includes(h)) row.pointName = cols[i] || "";
            else if (h === "segment") row.segment = cols[i] || "Fresh Milk";
            else if (["mobileno", "mobile_no", "mobile", "phone"].includes(h)) row.mobileNo = cols[i] || "";
            else if (h === "address") row.address = cols[i] || "";
          });
          if (!row.agentCode) row.agentCode = `AGT-${idx + 1}`;
          if (!row.agentName) row.agentName = cols[1] || cols[0] || "";
          if (!row.pointName) row.pointName = cols[2] || row.agentName;
          return row;
        }).filter((a: any) => a.agentName);
        if (parsed.length === 0) { toast({ title: "No valid agents found", variant: "destructive" }); return; }
        bulkUploadMutation.mutate({ routeId: bulkRouteId, agentsList: parsed });
      } catch { toast({ title: "Failed to parse CSV", variant: "destructive" }); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const generateCSV = useCallback((segName: string, segData: SegData, shift?: string) => {
    const prods = segData.products;
    const headers = ["S.No", "Agent Code", "Agent Name", "Point Name"];
    if (segName === 'Fresh Milk' && shift === 'combined') {
      prods.forEach(p => { headers.push(`${shortProductName(p)} (M)`, `${shortProductName(p)} (E)`); });
    } else {
      prods.forEach(p => { headers.push(shortProductName(p)); });
    }
    if (segName === 'Fresh Milk') headers.push("Free Milk Qty (L)");
    headers.push("Value (₹)");

    const shiftFilter = (shift === 'morning' || shift === 'evening' || shift === 'combined') ? shift : 'combined';
    const filteredAgents = segData.agents.filter(a => agentHasShiftOrders(a, shiftFilter as any));

    const rows: string[][] = [];
    let sno = 0;
    filteredAgents.forEach((a) => {
      sno++;
      const row = [String(sno), a.agentCode, a.agentName, a.pointName];
      if (segName === 'Fresh Milk' && shift === 'combined') {
        prods.forEach(p => { row.push(String(a.morning[p] || 0), String(a.evening[p] || 0)); });
        row.push(String((a.freeMilkQty || 0).toFixed(1)));
        row.push(String(a.totalValue.toFixed(0)));
      } else if (segName === 'Fresh Milk') {
        const bucket = shift === 'morning' ? a.morning : a.evening;
        prods.forEach(p => { row.push(String(bucket[p] || 0)); });
        row.push(String((a.freeMilkQty || 0).toFixed(1)));
        row.push(String(shift === 'morning' ? a.morningValue.toFixed(0) : a.eveningValue.toFixed(0)));
      } else {
        prods.forEach(p => { row.push(String(a.morning[p] || 0)); });
        row.push(String(a.morningValue.toFixed(0)));
      }
      rows.push(row);
    });

    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const officeSlug = (office?.officeName || 'Union').replace(/\s+/g, '_');
    const routeSlug = (selectedRoute?.routeName || '').replace(/\s+/g, '_');
    link.download = `${officeSlug}_${routeSlug}_dispatch_${segName.replace(/\s/g, '_')}_${dispatchDate}_${shift || 'morning'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [dispatchDate, office, selectedRoute]);

  const generateWhatsAppText = useCallback((segName: string, segData: SegData, shift?: string) => {
    const routeLabel = selectedRoute?.routeName || '';
    const officeLabel = office?.officeName || '';
    const shiftFilter = (shift === 'morning' || shift === 'evening' || shift === 'combined') ? shift : 'combined';
    const shiftEmoji = shiftFilter === 'morning' ? '☀️ ' : shiftFilter === 'evening' ? '🌙 ' : '';
    const shiftLabel = shiftFilter === 'morning' ? 'Morning' : shiftFilter === 'evening' ? 'Evening' : '';

    let text = `*${officeLabel} - ${routeLabel}*\n`;
    text += `*${shiftEmoji}${segName} Dispatch Report${shiftLabel ? ' (' + shiftLabel + ')' : ''}*\n`;
    text += `📅 Dispatch: ${formatDate(dispatchDate)}\n`;
    text += `📦 Orders: ${segData.totalOrders} | 💰 Value: ₹${segData.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}\n\n`;

    const filteredAgents = segData.agents.filter(a => agentHasShiftOrders(a, shiftFilter as any));
    let sno = 0;
    filteredAgents.forEach((a) => {
      sno++;
      const val = segName === 'Fresh Milk' && shift === 'morning' ? a.morningValue : segName === 'Fresh Milk' && shift === 'evening' ? a.eveningValue : segName !== 'Fresh Milk' ? a.morningValue : a.totalValue;
      const freeMilkPart = segName === 'Fresh Milk' && (a.freeMilkQty || 0) > 0 ? ` 🥛 ${(a.freeMilkQty || 0).toFixed(1)} L free` : '';
      text += `*${sno}. ${a.agentCode}* ${a.agentName} (${a.pointName}) — ₹${val.toFixed(0)}${freeMilkPart}\n`;
      const bucket = segName === 'Fresh Milk' ? (shift === 'morning' ? a.morning : shift === 'evening' ? a.evening : null) : a.morning;
      if (bucket) {
        const items = Object.entries(bucket).filter(([_, q]) => q > 0).map(([p, q]) => `   ${shortProductName(p)}: ${q}`);
        if (items.length > 0) text += items.join("\n") + "\n";
      } else {
        const mItems = Object.entries(a.morning).filter(([_, q]) => q > 0).map(([p, q]) => `   ☀️ ${shortProductName(p)}: ${q}`);
        const eItems = Object.entries(a.evening).filter(([_, q]) => q > 0).map(([p, q]) => `   🌙 ${shortProductName(p)}: ${q}`);
        text += [...mItems, ...eItems].join("\n") + "\n";
      }
    });

    if (segName === 'Fresh Milk') {
      const totalFreeMilk = filteredAgents.reduce((s, a) => s + (a.freeMilkQty || 0), 0);
      if (totalFreeMilk > 0) {
        text += `\n🥛 *Total Free Milk: ${totalFreeMilk.toFixed(1)} L*\n`;
      }
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }, [dispatchDate, selectedRoute, office]);

  const renderDispatchContent = useCallback(() => {
    if (dispatchLoading) {
      return <div className="space-y-3"><Skeleton className="h-20" /><Skeleton className="h-40" /></div>;
    }
    if (!dispatchData?.segments) return null;

    return (
      <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 no-print">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{dispatchData.summary.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Matched Orders</p>
            {dispatchData.unmatchedOrderCount > 0 && (
              <button onClick={() => setShowUnmatched(!showUnmatched)} className="text-[10px] text-orange-500 hover:text-orange-700 underline cursor-pointer font-medium">
                {dispatchData.unmatchedOrderCount} unmatched {showUnmatched ? '▲' : '▼'}
              </button>
            )}
          </CardContent></Card>
          <Card className="bg-green-50 dark:bg-green-950 border-green-200"><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-700">₹{dispatchData.summary.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent></Card>
          {(dispatchData.summary.totalFreeMilkQty || 0) > 0 && (
            <Card className="bg-teal-50 dark:bg-teal-950 border-teal-200"><CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-teal-700">{(dispatchData.summary.totalFreeMilkQty || 0).toFixed(1)} L</p>
              <p className="text-xs text-muted-foreground">Free Milk</p>
            </CardContent></Card>
          )}
          {(['Fresh Milk', 'Products', 'Ice Cream'] as const).map(seg => {
            const sd = dispatchData.segments[seg];
            const unmatchedSegCount = (dispatchData.unmatchedOrders || []).filter(o => o.productSegment === seg).length;
            const totalOrders = (sd?.totalOrders || 0) + unmatchedSegCount;
            if (totalOrders === 0) return null;
            const icon = seg === 'Fresh Milk' ? <Milk className="h-4 w-4" /> : seg === 'Products' ? <Package className="h-4 w-4" /> : <IceCream2 className="h-4 w-4" />;
            const color = seg === 'Fresh Milk' ? 'text-emerald-700' : seg === 'Products' ? 'text-blue-700' : 'text-purple-700';
            return (
              <Card key={seg} className="bg-gray-50 dark:bg-gray-900"><CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">{icon}<span className={`text-lg font-bold ${color}`}>{totalOrders}</span></div>
                <p className="text-[10px] text-muted-foreground">{seg}</p>
                <p className="text-[10px] text-muted-foreground">₹{(sd?.totalValue || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
              </CardContent></Card>
            );
          })}
        </div>

        {showUnmatched && dispatchData.unmatchedOrders && dispatchData.unmatchedOrders.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 no-print">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-1">
                  <ShoppingBag className="h-4 w-4" /> Unmatched Orders ({dispatchData.unmatchedOrders.length})
                </h3>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                  const rows = dispatchData.unmatchedOrders.map((o, i) => {
                    const itemsStr = o.items.map(it => `${it.name} x${it.quantity}`).join('; ');
                    return [i + 1, o.customerName, o.productSegment, o.deliveryShift, itemsStr, o.total].join(',');
                  });
                  const csv = 'S.No,Customer Name,Segment,Shift,Items,Value\n' + rows.join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `unmatched_orders_${dispatchDate}.csv`; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="h-3 w-3" /> CSV
                </Button>
              </div>
              <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-950">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-orange-100 dark:bg-orange-900/30">
                      <TableHead className="text-xs w-10">S.No</TableHead>
                      <TableHead className="text-xs">Customer Name</TableHead>
                      <TableHead className="text-xs">Phone</TableHead>
                      <TableHead className="text-xs">Segment</TableHead>
                      <TableHead className="text-xs">Shift</TableHead>
                      <TableHead className="text-xs">Items</TableHead>
                      <TableHead className="text-xs w-20">Value</TableHead>
                      <TableHead className="text-xs w-36">Assign to Route</TableHead>
                      <TableHead className="text-xs w-36">Assign to Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatchData.unmatchedOrders.map((o, idx) => {
                      const suggestedAgentId = unmatchedPhoneSuggestions[String(o.id)];
                      const selectedAgentId = unmatchedAgentSelection[String(o.id)] ?? (suggestedAgentId || '');
                      const hasSuggestion = !!suggestedAgentId && !unmatchedAgentSelection[String(o.id)];
                      return (
                      <TableRow key={o.id}>
                        <TableCell className="text-xs">{idx + 1}</TableCell>
                        <TableCell className="text-xs font-medium">{o.customerName}</TableCell>
                        <TableCell className="text-xs">
                          {o.customerPhone ? (
                            <a href={`tel:${o.customerPhone}`} className="text-blue-600 hover:underline font-mono">{o.customerPhone}</a>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{o.productSegment}</Badge></TableCell>
                        <TableCell className="text-xs capitalize">{o.deliveryShift}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {o.items.map(it => `${it.name} ×${it.quantity}`).join(', ')}
                        </TableCell>
                        <TableCell className="text-xs font-medium">₹{o.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell>
                          <Select value={unmatchedRouteSelection[o.id] || selectedRouteId || ''} onValueChange={(routeId) => handleUnmatchedRouteChange(String(o.id), routeId)}>
                            <SelectTrigger className="h-7 text-xs w-32">
                              <SelectValue placeholder="Select route" />
                            </SelectTrigger>
                            <SelectContent>
                              {routes.map(r => (
                                <SelectItem key={r.id} value={r.id} className="text-xs">
                                  {r.routeCode} - {r.routeName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={selectedAgentId} onValueChange={(agentId) => {
                            setUnmatchedAgentSelection(prev => ({ ...prev, [String(o.id)]: agentId }));
                            const assignRouteId = unmatchedRouteSelection[o.id] || selectedRouteId;
                            if (assignRouteId) {
                              assignOrderMutation.mutate({ routeId: assignRouteId, orderId: o.id, agentId });
                            }
                          }}>
                            <SelectTrigger className={`h-7 text-xs w-36 ${hasSuggestion ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' : ''}`}>
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                const assignRouteId = unmatchedRouteSelection[o.id] || selectedRouteId;
                                const agentList = assignRouteId === selectedRouteId
                                  ? (dispatchData.agents || [])
                                  : (unmatchedRouteAgents[assignRouteId || ''] || []);
                                return agentList.map(agent => (
                                  <SelectItem key={agent.id} value={agent.id} className="text-xs">
                                    {agent.agentCode} - {agent.agentName}
                                    {suggestedAgentId === agent.id ? ' 📞' : ''}
                                  </SelectItem>
                                ));
                              })()}
                            </SelectContent>
                          </Select>
                          {hasSuggestion && <p className="text-[9px] text-blue-500 mt-0.5">Matched by phone</p>}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {(() => {
          const allOrders: MatchedOrder[] = [
            ...(dispatchData.matchedOrders || []).map(o => ({ ...o })),
            ...(dispatchData.unmatchedOrders || []).map(o => ({ ...o, currentAgentId: null, currentAgentCode: null, currentAgentName: null })),
          ];
          if (allOrders.length === 0) return null;
          return (
            <Card className="border-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/20 no-print">
              <CardContent className="p-3">
                <button onClick={() => setShowAllOrders(!showAllOrders)} className="w-full flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-indigo-700 flex items-center gap-1">
                    <List className="h-4 w-4" /> All Orders ({allOrders.length})
                  </h3>
                  {showAllOrders ? <ChevronUp className="h-4 w-4 text-indigo-500" /> : <ChevronDown className="h-4 w-4 text-indigo-500" />}
                </button>
                {showAllOrders && (
                  <div className="border rounded-lg overflow-x-auto bg-white dark:bg-gray-950 mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-indigo-100 dark:bg-indigo-900/30">
                          <TableHead className="text-xs w-10">S.No</TableHead>
                          <TableHead className="text-xs">Customer</TableHead>
                          <TableHead className="text-xs">Segment</TableHead>
                          <TableHead className="text-xs">Shift</TableHead>
                          <TableHead className="text-xs">Items</TableHead>
                          <TableHead className="text-xs w-20">Value</TableHead>
                          <TableHead className="text-xs w-32">Current Agent</TableHead>
                          <TableHead className="text-xs w-36">Assign to Agent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allOrders.map((o, idx) => (
                          <TableRow key={o.id} className={o.currentAgentId ? '' : 'bg-orange-50/50 dark:bg-orange-950/10'}>
                            <TableCell className="text-xs">{idx + 1}</TableCell>
                            <TableCell className="text-xs font-medium">{o.customerName}</TableCell>
                            <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{o.productSegment}</Badge></TableCell>
                            <TableCell className="text-xs capitalize">{o.deliveryShift}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {o.items.map(it => `${it.name} ×${it.quantity}`).join(', ')}
                            </TableCell>
                            <TableCell className="text-xs font-medium">₹{o.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                            <TableCell className="text-xs">
                              {o.currentAgentName
                                ? <span className="text-green-700 font-medium">{o.currentAgentCode || ''} {o.currentAgentName}</span>
                                : <span className="text-orange-500 italic">Unmatched</span>}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={o.currentAgentId || ''}
                                onValueChange={(agentId) => {
                                  if (selectedRouteId) {
                                    assignOrderMutation.mutate({ routeId: selectedRouteId, orderId: o.id, agentId });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs w-32">
                                  <SelectValue placeholder="Select agent" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(dispatchData.agents || []).map(agent => (
                                    <SelectItem key={agent.id} value={agent.id} className="text-xs">
                                      {agent.agentCode} - {agent.agentName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {dispatchData.summary.totalOrders === 0 ? (
          <Card className="border-dashed"><CardContent className="p-6 text-center">
            <Info className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-sm font-medium">No matched orders for {formatDate(dispatchData.orderDate)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {dispatchData.totalAllUnionOrders > 0
                ? `${dispatchData.totalAllUnionOrders} union orders exist but none match agents on this route. Ensure agent codes/names match customer names in orders.`
                : `No orders placed on ${formatDate(dispatchData.orderDate)}. Orders placed today appear in tomorrow's dispatch.`}
            </p>
          </CardContent></Card>
        ) : (
          <Tabs value={activeSegTab} onValueChange={setActiveSegTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-9 no-print">
              <TabsTrigger value="freshMilk" className="text-xs">
                <Milk className="h-3 w-3 mr-1" /> Fresh Milk ({(dispatchData.segments['Fresh Milk']?.totalOrders || 0) + (dispatchData.unmatchedOrders || []).filter(o => o.productSegment === 'Fresh Milk').length})
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs">
                <Package className="h-3 w-3 mr-1" /> Products ({(dispatchData.segments['Products']?.totalOrders || 0) + (dispatchData.unmatchedOrders || []).filter(o => o.productSegment === 'Products').length})
              </TabsTrigger>
              <TabsTrigger value="iceCream" className="text-xs">
                <IceCream2 className="h-3 w-3 mr-1" /> Ice Cream ({(dispatchData.segments['Ice Cream']?.totalOrders || 0) + (dispatchData.unmatchedOrders || []).filter(o => o.productSegment === 'Ice Cream').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="freshMilk">
              <FreshMilkReport
                segData={dispatchData.segments['Fresh Milk']}
                shift={freshMilkShift}
                onShiftChange={setFreshMilkShift}
                dispatchDate={dispatchDate}
                routeName={selectedRoute?.routeName || ''}
                officeName={office?.officeName || ''}
                routeId={selectedRouteId!}
                onDownload={() => dispatchData.segments['Fresh Milk'] && generateCSV('Fresh Milk', dispatchData.segments['Fresh Milk'], freshMilkShift)}
                onShare={() => dispatchData.segments['Fresh Milk'] && generateWhatsAppText('Fresh Milk', dispatchData.segments['Fresh Milk'], freshMilkShift)}
                onStatement={() => openPaymentStatementPDF({ routeId: selectedRouteId!, dispatchDate, routeName: selectedRoute?.routeName || '', officeName: office?.officeName || '' })}
              />
            </TabsContent>

            <TabsContent value="products">
              <MorningOnlyReport
                segName="Products"
                segData={dispatchData.segments['Products']}
                dispatchDate={dispatchDate}
                routeName={selectedRoute?.routeName || ''}
                officeName={office?.officeName || ''}
                onDownload={() => dispatchData.segments['Products'] && generateCSV('Products', dispatchData.segments['Products'], 'morning')}
                onShare={() => dispatchData.segments['Products'] && generateWhatsAppText('Products', dispatchData.segments['Products'], 'morning')}
              />
            </TabsContent>

            <TabsContent value="iceCream">
              <MorningOnlyReport
                segName="Ice Cream"
                segData={dispatchData.segments['Ice Cream']}
                dispatchDate={dispatchDate}
                routeName={selectedRoute?.routeName || ''}
                officeName={office?.officeName || ''}
                onDownload={() => dispatchData.segments['Ice Cream'] && generateCSV('Ice Cream', dispatchData.segments['Ice Cream'], 'morning')}
                onShare={() => dispatchData.segments['Ice Cream'] && generateWhatsAppText('Ice Cream', dispatchData.segments['Ice Cream'], 'morning')}
              />
            </TabsContent>
          </Tabs>
        )}

        {agents.length > 0 && (
          <div className="mt-4 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Route Agents ({agents.length})</h3>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Order Date:</Label>
                <Input type="date" value={agentListDate} onChange={e => setAgentListDate(e.target.value)} className="h-8 text-xs w-36" />
              </div>
            </div>

            <Tabs value={agentListTab} onValueChange={v => setAgentListTab(v as 'ordered' | 'unordered')} className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-9">
                <TabsTrigger value="ordered" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Ordered ({orderedAgents.length})
                </TabsTrigger>
                <TabsTrigger value="unordered" className="text-xs">
                  <XCircle className="h-3 w-3 mr-1" /> Unordered ({unorderedAgents.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ordered">
                {agentDispatchLoading ? (
                  <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : orderedAgents.length === 0 ? (
                  <Card className="border-dashed mt-2"><CardContent className="p-6 text-center">
                    <Info className="h-6 w-6 mx-auto text-amber-500 mb-2" />
                    <p className="text-sm text-muted-foreground">No agents have placed orders for {formatDate(validAgentListDate)}</p>
                  </CardContent></Card>
                ) : (
                  <div className="border rounded-lg overflow-x-auto mt-2">
                    <Table>
                      <TableHeader><TableRow className="bg-green-50 dark:bg-green-950">
                        <TableHead className="text-xs w-10">S.No</TableHead>
                        <TableHead className="text-xs w-16">Code</TableHead>
                        <TableHead className="text-xs">Agent Name</TableHead>
                        <TableHead className="text-xs">Point Name</TableHead>
                        <TableHead className="text-xs">Segment</TableHead>
                        <TableHead className="text-xs">Mobile</TableHead>
                        <TableHead className="text-xs w-16">Orders</TableHead>
                        <TableHead className="text-xs w-20">Value</TableHead>
                        <TableHead className="text-xs w-16">Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {orderedAgents.map((agent, idx) => (
                          <TableRow key={agent.id}>
                            <TableCell className="text-xs">{idx + 1}</TableCell>
                            <TableCell className="text-xs font-mono">{agent.agentCode}</TableCell>
                            <TableCell className="text-xs font-medium">{agent.agentName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{agent.pointName}</TableCell>
                            <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{agent.segment}</Badge></TableCell>
                            <TableCell className="text-xs">{agent.mobileNo || '—'}</TableCell>
                            <TableCell className="text-xs"><Badge className="bg-green-100 text-green-700 text-[10px]">{agent.orderCount}</Badge></TableCell>
                            <TableCell className="text-xs font-medium">₹{agent.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
                            {!isFieldOps && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditAgent(agent)}><Edit className="h-3 w-3" /></Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setDeleteAgentId(agent.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unordered">
                {agentDispatchLoading ? (
                  <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : unorderedAgents.length === 0 ? (
                  <Card className="border-dashed mt-2"><CardContent className="p-6 text-center">
                    <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
                    <p className="text-sm text-muted-foreground">All agents have placed orders for {formatDate(validAgentListDate)}</p>
                  </CardContent></Card>
                ) : (
                  <div className="border rounded-lg overflow-x-auto mt-2">
                    <Table>
                      <TableHeader><TableRow className="bg-red-50 dark:bg-red-950">
                        <TableHead className="text-xs w-10">S.No</TableHead>
                        <TableHead className="text-xs w-16">Code</TableHead>
                        <TableHead className="text-xs">Agent Name</TableHead>
                        <TableHead className="text-xs">Point Name</TableHead>
                        <TableHead className="text-xs">Segment</TableHead>
                        <TableHead className="text-xs">Mobile</TableHead>
                        <TableHead className="text-xs w-16">Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {unorderedAgents.map((agent, idx) => (
                          <TableRow key={agent.id}>
                            <TableCell className="text-xs">{idx + 1}</TableCell>
                            <TableCell className="text-xs font-mono">{agent.agentCode}</TableCell>
                            <TableCell className="text-xs font-medium">{agent.agentName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{agent.pointName}</TableCell>
                            <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{agent.segment}</Badge></TableCell>
                            <TableCell className="text-xs">{agent.mobileNo || '—'}</TableCell>
                            {!isFieldOps && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditAgent(agent)}><Edit className="h-3 w-3" /></Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => setDeleteAgentId(agent.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </>
    );
  }, [dispatchLoading, dispatchData, freshMilkShift, dispatchDate, selectedRoute, office, agents, agentListDate, agentListTab, agentDispatchLoading, orderedAgents, unorderedAgents, validAgentListDate, generateCSV, generateWhatsAppText, setFreshMilkShift, openEditAgent, setDeleteAgentId, setAgentListDate, setAgentListTab, showUnmatched, showAllOrders, selectedRouteId, assignOrderMutation, routes, unmatchedRouteSelection, unmatchedRouteAgents, unmatchedPhoneSuggestions, unmatchedAgentSelection, setUnmatchedAgentSelection, isFieldOps]);

  if (routesLoading) {
    return <div className="p-4 md:p-6 space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-2 sm:grid-cols-3 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>;
  }

  const totalMatched = dispatchData?.matchedOrderCount || 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

      <style>{`
        @media print {
          @page { size: landscape; margin: 6mm; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; overflow: visible; }
          .print-area table {
            font-size: 11px;
            width: 100%;
            table-layout: auto;
            border-collapse: collapse;
          }
          .print-area th, .print-area td {
            padding: 3px 4px;
            white-space: nowrap;
            border: 1px solid #bbb;
            vertical-align: middle;
            text-align: center;
          }
          .print-area th { font-weight: 700; background-color: #f0fdf4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-area td:nth-child(1), .print-area th:nth-child(1) { width: 24px; }
          .print-area td:nth-child(2), .print-area th:nth-child(2) { width: 36px; }
          .print-area td:nth-child(3), .print-area th:nth-child(3) { width: 100px; text-align: left; max-width: 110px; }
          .print-area td:nth-child(4), .print-area th:nth-child(4) { width: 90px; text-align: left; max-width: 100px; }
          .print-area td:last-child, .print-area th:last-child { width: 55px; text-align: right; font-weight: 600; }
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          .hidden-on-screen { display: block !important; }
        }
        .print-header { display: none; }
        .hidden-on-screen { display: none; }
      `}</style>

      <div className="flex items-center gap-3 flex-wrap no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate("/merchant/mmo")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">{office?.officeName || "MMO Office"} — Routes</h1>
          <p className="text-sm text-muted-foreground">Select a route to view dispatch report</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md overflow-hidden">
            <Button size="sm" variant={routeViewMode === 'list' ? 'default' : 'ghost'} className="rounded-none h-8 px-2" onClick={() => setRouteViewMode('list')}><List className="h-4 w-4" /></Button>
            <Button size="sm" variant={routeViewMode === 'tile' ? 'default' : 'ghost'} className="rounded-none h-8 px-2" onClick={() => setRouteViewMode('tile')}><LayoutGrid className="h-4 w-4" /></Button>
          </div>
          {!isFieldOps && <Button onClick={openCreateRoute}><Plus className="h-4 w-4 mr-2" /> Add Route</Button>}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 no-print">
        <CalendarDays className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Dispatch Date: <span className="text-amber-700 dark:text-amber-400">{formatDate(dispatchDate)}</span></p>
          <p className="text-xs text-muted-foreground">Showing orders from {dispatchData?.orderDate ? formatDate(dispatchData.orderDate) : "previous day"} — Today's orders appear in tomorrow's dispatch</p>
        </div>
        <Input type="date" className="w-40 h-8 text-xs" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} />
      </div>

      {routes.length === 0 ? (
        <Card className="no-print"><CardContent className="p-8 text-center">
          <Route className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h2 className="text-lg font-semibold mb-1">No Routes Yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Create routes to manage delivery points and agents</p>
          {!isFieldOps && <Button onClick={openCreateRoute}><Plus className="h-4 w-4 mr-2" /> Create Route</Button>}
        </CardContent></Card>
      ) : routeViewMode === 'tile' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 no-print">
          {routes.map(route => {
            const isActive = selectedRouteId === route.id;
            return (
              <Card key={route.id} className={`cursor-pointer transition-all hover:shadow-md ${isActive ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                onClick={() => setSelectedRouteId(isActive ? null : route.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Route className="h-5 w-5 text-green-600 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{route.routeName}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{route.routeCode}</p>
                      </div>
                    </div>
                    {isActive && <ChevronUp className="h-4 w-4 text-purple-500 shrink-0" />}
                  </div>
                  {isActive && totalMatched > 0 && (
                    <Badge className="mt-2 bg-green-100 text-green-800 text-[10px]"><ShoppingBag className="h-3 w-3 mr-1" />{totalMatched} orders</Badge>
                  )}
                  {route.areaDescription && <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{route.areaDescription}</p>}
                  <RouteCollectionBadge routeId={route.id} date={dispatchDate} />
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-400" onClick={(e) => { e.stopPropagation(); openPaymentStatementPDF({ routeId: route.id, dispatchDate, routeName: route.routeName, officeName: office?.officeName || '' }); }}><Receipt className="h-3 w-3 mr-1" /> ₹ Statement</Button>
                    <div onClick={e => e.stopPropagation()}><CollectionDropdown iconOnly routeId={route.id} dispatchDate={dispatchDate} routeName={route.routeName} officeName={office?.officeName || ''} /></div>
                    {!isFieldOps && (
                      <>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEditRoute(route); }}><Edit className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteRouteId(route.id); }}><Trash2 className="h-3 w-3" /></Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden no-print">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900">
                <TableHead className="text-xs w-10">S.No</TableHead>
                <TableHead className="text-xs">Route Name</TableHead>
                <TableHead className="text-xs w-28">Route Code</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Area</TableHead>
                <TableHead className="text-xs w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route, idx) => {
                const isActive = selectedRouteId === route.id;
                return (
                  <React.Fragment key={route.id}>
                    <TableRow
                      className={`cursor-pointer transition-colors ${isActive ? 'bg-purple-50 dark:bg-purple-950 border-l-2 border-l-purple-500' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                      onClick={() => setSelectedRouteId(isActive ? null : route.id)}>
                      <TableCell className="text-xs">{idx + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4 text-green-600 shrink-0" />
                          <span className="text-sm font-medium">{route.routeName}</span>
                          {isActive ? <ChevronUp className="h-3 w-3 text-purple-500 shrink-0" /> : <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{route.routeCode}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{route.areaDescription || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-700" title="₹ Statement" onClick={(e) => { e.stopPropagation(); openPaymentStatementPDF({ routeId: route.id, dispatchDate, routeName: route.routeName, officeName: office?.officeName || '' }); }}><Receipt className="h-3 w-3" /></Button>
                          <div onClick={e => e.stopPropagation()}><CollectionDropdown iconOnly routeId={route.id} dispatchDate={dispatchDate} routeName={route.routeName} officeName={office?.officeName || ''} /></div>
                          {!isFieldOps && (
                            <>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openEditRoute(route); }}><Edit className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteRouteId(route.id); }}><Trash2 className="h-3 w-3" /></Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {isActive && selectedRoute && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="p-0">
                          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/30 border-l-2 border-l-purple-500 space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <h2 className="text-base font-bold flex items-center gap-2">
                                <Route className="h-4 w-4 text-green-600" /> {selectedRoute.routeName} — Dispatch Report
                              </h2>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-400" onClick={() => openPaymentStatementPDF({ routeId: selectedRouteId!, dispatchDate, routeName: selectedRoute.routeName, officeName: office?.officeName || '' })}><Receipt className="h-3 w-3 mr-1" /> ₹ Statement</Button>
                                <CollectionDropdown routeId={selectedRouteId!} dispatchDate={dispatchDate} routeName={selectedRoute.routeName} officeName={office?.officeName || ''} />
                                {!isFieldOps && (
                                  <>
                                    <Button size="sm" variant="outline" onClick={handleBulkUpload}><Upload className="h-3 w-3 mr-1" /> Bulk Upload</Button>
                                    <Button size="sm" onClick={openCreateAgent}><Plus className="h-3 w-3 mr-1" /> Add Agent</Button>
                                  </>
                                )}
                              </div>
                            </div>
                            {renderDispatchContent()}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedRoute && (
        <div className={`space-y-4 border-t pt-4 print-area ${routeViewMode === 'list' ? 'hidden-on-screen' : ''}`}>
          <div className="print-header border-b pb-3 mb-3">
            <h2 className="text-xl font-bold text-center">{office?.officeName} — {selectedRoute.routeName} Daily Dispatch Report</h2>
            <p className="text-sm text-center text-muted-foreground">Dispatch Date: {formatDate(dispatchDate)} | Orders from: {dispatchData?.orderDate ? formatDate(dispatchData.orderDate) : ''}</p>
          </div>

          {routeViewMode === 'tile' && (
            <div className="flex items-center justify-between flex-wrap gap-2 no-print">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Route className="h-5 w-5 text-green-600" /> {selectedRoute.routeName} — Daily Dispatch Report
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-400" onClick={() => openPaymentStatementPDF({ routeId: selectedRouteId!, dispatchDate, routeName: selectedRoute.routeName, officeName: office?.officeName || '' })}><Receipt className="h-3 w-3 mr-1" /> ₹ Statement</Button>
                <CollectionDropdown routeId={selectedRouteId!} dispatchDate={dispatchDate} routeName={selectedRoute.routeName} officeName={office?.officeName || ''} />
                {!isFieldOps && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleBulkUpload}><Upload className="h-3 w-3 mr-1" /> Bulk Upload</Button>
                    <Button size="sm" onClick={openCreateAgent}><Plus className="h-3 w-3 mr-1" /> Add Agent</Button>
                  </>
                )}
              </div>
            </div>
          )}

          {renderDispatchContent()}
        </div>
      )}

      <Dialog open={routeDialogOpen} onOpenChange={v => !v && closeRouteDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editRoute ? "Edit Route" : "Add Route"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Route Name *</Label><Input value={routeForm.routeName} onChange={e => setRouteForm(f => ({ ...f, routeName: e.target.value }))} placeholder="e.g. Tharamangalam" /></div>
            <div><Label>Route Code *</Label><Input value={routeForm.routeCode} onChange={e => setRouteForm(f => ({ ...f, routeCode: e.target.value }))} placeholder="e.g. RT-TMA-01" /></div>
            <div><Label>Area Description</Label><Textarea value={routeForm.areaDescription} onChange={e => setRouteForm(f => ({ ...f, areaDescription: e.target.value }))} placeholder="Areas covered" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeRouteDialog}>Cancel</Button>
            <Button onClick={handleRouteSubmit} disabled={createRouteMutation.isPending || updateRouteMutation.isPending}>{editRoute ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={agentDialogOpen} onOpenChange={v => !v && closeAgentDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editAgent ? "Edit Agent" : "Add Agent / Delivery Point"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Agent Code</Label><Input value={agentForm.agentCode} onChange={e => setAgentForm(f => ({ ...f, agentCode: e.target.value }))} placeholder="e.g. 3590" /></div>
            <div><Label>Agent Name *</Label><Input value={agentForm.agentName} onChange={e => setAgentForm(f => ({ ...f, agentName: e.target.value }))} placeholder="Agent name" /></div>
            <div><Label>Point Name *</Label><Input value={agentForm.pointName} onChange={e => setAgentForm(f => ({ ...f, pointName: e.target.value }))} placeholder="Delivery point" /></div>
            <div>
              <Label>Segment</Label>
              <Select value={agentForm.segment} onValueChange={v => setAgentForm(f => ({ ...f, segment: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fresh Milk">Fresh Milk</SelectItem>
                  <SelectItem value="Products">Products</SelectItem>
                  <SelectItem value="Ice Cream">Ice Cream</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Mobile No</Label><Input value={agentForm.mobileNo} onChange={e => setAgentForm(f => ({ ...f, mobileNo: e.target.value }))} placeholder="+91..." /></div>
            <div><Label>Address</Label><Textarea value={agentForm.address} onChange={e => setAgentForm(f => ({ ...f, address: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAgentDialog}>Cancel</Button>
            <Button onClick={handleAgentSubmit} disabled={createAgentMutation.isPending || updateAgentMutation.isPending}>{editAgent ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRouteId} onOpenChange={() => setDeleteRouteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Route?</AlertDialogTitle><AlertDialogDescription>This will deactivate the route and all its agents.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteRouteId && deleteRouteMutation.mutate(deleteRouteId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAgentId} onOpenChange={() => setDeleteAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove Agent?</AlertDialogTitle><AlertDialogDescription>This agent will be deactivated.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteAgentId && deleteAgentMutation.mutate(deleteAgentId)} className="bg-red-600 hover:bg-red-700">Remove</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function openPrintPreview({
  segData, shift, segName, dispatchDate, routeName, officeName,
}: {
  segData: SegData;
  shift: 'morning' | 'evening' | 'combined';
  segName: string;
  dispatchDate: string;
  routeName: string;
  officeName: string;
}) {
  const prods = segData.products;
  const agents = segData.agents.filter(a => agentHasShiftOrders(a, shift));
  const isCombined = shift === 'combined';
  const shiftLabel = shift === 'morning' ? 'Morning' : shift === 'evening' ? 'Evening' : 'Combined (Morning + Evening)';

  const thStyle = 'border:1px solid #999;padding:5px 6px;font-size:12px;font-weight:700;background:#f0fdf4;text-align:center;vertical-align:middle;';
  const thMStyle = 'border:1px solid #999;padding:3px 5px;font-size:11px;font-weight:700;background:#fef9c3;text-align:center;';
  const thEStyle = 'border:1px solid #999;padding:3px 5px;font-size:11px;font-weight:700;background:#dbeafe;text-align:center;';
  const tdStyle = 'border:1px solid #aaa;padding:5px 6px;font-size:12px;text-align:center;vertical-align:middle;';
  const tdLeftStyle = 'border:1px solid #aaa;padding:5px 6px;font-size:12px;text-align:left;vertical-align:middle;';
  const tdRightStyle = 'border:1px solid #aaa;padding:5px 6px;font-size:12px;text-align:right;font-weight:600;vertical-align:middle;';
  const tdTotStyle = 'border:1px solid #aaa;padding:5px 6px;font-size:12px;text-align:center;font-weight:700;background:#dcfce7;vertical-align:middle;';
  const tdTotRightStyle = 'border:1px solid #aaa;padding:5px 6px;font-size:12px;text-align:right;font-weight:700;background:#dcfce7;vertical-align:middle;';
  const tdTotLeftStyle = 'border:1px solid #aaa;padding:5px 6px;font-size:12px;text-align:left;font-weight:700;background:#dcfce7;vertical-align:middle;';

  const isFreshMilk = segName === 'Fresh Milk';
  const thFMStyle = 'border:1px solid #999;padding:5px 6px;font-size:12px;font-weight:700;background:#dcfce7;text-align:center;vertical-align:middle;';

  const headerRow = `<tr>
    <th style="${thStyle}">S.No</th>
    <th style="${thStyle}">Code</th>
    <th style="${thStyle};text-align:left;">Agent Name</th>
    <th style="${thStyle};text-align:left;">Point Name</th>
    ${prods.map(p => isCombined
      ? `<th colspan="2" style="${thStyle}">${shortProductName(p)}</th>`
      : `<th style="${thStyle}">${shortProductName(p)}</th>`
    ).join('')}
    ${isFreshMilk ? `<th style="${thFMStyle}">Free Milk (L)</th>` : ''}
    <th style="${thStyle};text-align:right;">Value (₹)</th>
  </tr>`;

  const subHeader = isCombined ? `<tr>
    <th colspan="4" style="${thStyle}"></th>
    ${prods.map(() => `<th style="${thMStyle}">M</th><th style="${thEStyle}">E</th>`).join('')}
    ${isFreshMilk ? `<th style="${thStyle}"></th>` : ''}
    <th style="${thStyle}"></th>
  </tr>` : '';

  const dataRows = agents.map((a, idx) => {
    const value = shift === 'morning' ? a.morningValue : shift === 'evening' ? a.eveningValue : a.totalValue;
    const prodCells = isCombined
      ? prods.map(p => `<td style="${tdStyle}">${a.morning[p] || '—'}</td><td style="${tdStyle}">${a.evening[p] || '—'}</td>`).join('')
      : prods.map(p => `<td style="${tdStyle}">${(shift === 'morning' ? a.morning : a.evening)[p] || '—'}</td>`).join('');
    const freeMilkCell = isFreshMilk
      ? `<td style="${tdStyle};color:#16a34a;font-weight:600;">${(a.freeMilkQty || 0) > 0 ? (a.freeMilkQty || 0).toFixed(1) : '—'}</td>`
      : '';
    return `<tr>
      <td style="${tdStyle}">${idx + 1}</td>
      <td style="${tdStyle}">${a.agentCode}</td>
      <td style="${tdLeftStyle}">${a.agentName}</td>
      <td style="${tdLeftStyle}">${a.pointName}</td>
      ${prodCells}
      ${freeMilkCell}
      <td style="${tdRightStyle}">₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
    </tr>`;
  }).join('');

  const totalValue = isCombined
    ? segData.totalValue
    : agents.reduce((s, a) => s + (shift === 'morning' ? a.morningValue : a.eveningValue), 0);
  const totalCells = isCombined
    ? prods.map(p => `<td style="${tdTotStyle}">${segData.productTotals[p]?.morning || 0}</td><td style="${tdTotStyle}">${segData.productTotals[p]?.evening || 0}</td>`).join('')
    : prods.map(p => `<td style="${tdTotStyle}">${segData.productTotals[p]?.[shift] || 0}</td>`).join('');
  const totalFreeMilkCell = isFreshMilk
    ? `<td style="${tdTotStyle};color:#16a34a;">${agents.reduce((s, a) => s + (a.freeMilkQty || 0), 0).toFixed(1)}</td>`
    : '';
  const totalRow = `<tr>
    <td colspan="4" style="${tdTotLeftStyle}">TOTAL</td>
    ${totalCells}
    ${totalFreeMilkCell}
    <td style="${tdTotRightStyle}">₹${totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
  </tr>`;

  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>${officeName} — ${routeName} Dispatch</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; }
    .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 6px; }
    .header h1 { font-size: 16px; font-weight: bold; }
    .header p { font-size: 11px; color: #555; margin-top: 3px; }
    .meta { font-size: 12px; margin-bottom: 6px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head><body>
  <div class="header">
    <h1>${officeName} — ${routeName} Daily Dispatch Report</h1>
    <p>Dispatch Date: ${formatDate(dispatchDate)} &nbsp;|&nbsp; Shift: ${shiftLabel}</p>
  </div>
  <div class="meta">${segName} — ${segData.totalOrders} orders &nbsp;|&nbsp; Total Value: ₹${segData.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
  <table>
    <thead>${headerRow}${subHeader}</thead>
    <tbody>${dataRows}${totalRow}</tbody>
  </table>
</body></html>`;

  const w = window.open('', '_blank', 'width=1280,height=900');
  if (!w) { alert('Pop-up blocked — please allow pop-ups for this site and try again.'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

async function openPaymentStatementPDF({
  routeId, dispatchDate, routeName, officeName,
}: {
  routeId: string;
  dispatchDate: string;
  routeName: string;
  officeName: string;
}) {
  const res = await fetch(`/api/mmo/routes/${routeId}/payment-statement?date=${dispatchDate}`, { credentials: 'include' });
  if (!res.ok) { alert('Failed to fetch payment statement: ' + (await res.text())); return; }
  const data = await res.json();
  const rows: any[] = data.rows || [];

  if (rows.length === 0) {
    alert('No online payment transactions found for this date.');
    return;
  }

  const thS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#f0fdf4;text-align:center;white-space:nowrap;';
  const tdS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:center;white-space:nowrap;';
  const tdLS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:left;';
  const tdRS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:right;font-weight:600;';
  const totS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#dcfce7;text-align:right;';
  const totLS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#dcfce7;text-align:center;';

  const orderDate = data.orderDate ? formatDate(data.orderDate) : formatDate(dispatchDate);
  const deliverFor = data.dispatchDate ? formatDate(data.dispatchDate) : '';

  const headerRow = `<tr>
    <th style="${thS}">S.No</th>
    <th style="${thS}">Zone</th>
    <th style="${thS}">Shift</th>
    <th style="${thS}">Booth Code</th>
    <th style="${thS};text-align:left;">Agent Name</th>
    <th style="${thS}">Order #</th>
    <th style="${thS}">PG Name</th>
    <th style="${thS}">Txn Type</th>
    <th style="${thS};text-align:right;">Amount (₹)</th>
    <th style="${thS}">Txn ID</th>
  </tr>`;

  const dataRows = rows.length === 0
    ? `<tr><td colspan="10" style="${tdS}color:#888;">No online payment transactions found for this date.</td></tr>`
    : rows.map(r => `<tr>
        <td style="${tdS}">${r.sno}</td>
        <td style="${tdS}">${r.zone}</td>
        <td style="${tdS}">${(r.shift || 'morning').charAt(0).toUpperCase() + (r.shift || 'morning').slice(1)}</td>
        <td style="${tdS}">${r.boothCode}</td>
        <td style="${tdLS}">${r.agentName}</td>
        <td style="${tdS}">${r.orderId}</td>
        <td style="${tdS}">${r.pgName}</td>
        <td style="${tdS}">${r.txnType}</td>
        <td style="${tdRS}">₹${r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="${tdLS};font-size:10px;">${r.txnId}</td>
      </tr>`).join('');

  const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);
  const totalRow = rows.length > 0 ? `<tr>
    <td colspan="8" style="${totLS}">TOTAL — ${rows.length} transaction${rows.length !== 1 ? 's' : ''}</td>
    <td style="${totS}">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td style="${totLS}"></td>
  </tr>` : '';

  const html = `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8">
  <title>${officeName} — ${routeName} Online Payment Statement</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; }
    .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #166534; padding-bottom: 8px; }
    .header h1 { font-size: 15px; font-weight: bold; color: #166534; }
    .header h2 { font-size: 13px; font-weight: 600; margin-top: 2px; }
    .header p { font-size: 11px; color: #555; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head><body>
  <div class="header">
    <h1>${officeName}</h1>
    <h2>Online Payment Statement — ${routeName}</h2>
    <p>Order Date: ${orderDate} &nbsp;|&nbsp; Deliver For: ${deliverFor}</p>
  </div>
  <table>
    <thead>${headerRow}</thead>
    <tbody>${dataRows}${totalRow}</tbody>
  </table>
</body></html>`;

  const w = window.open('', '_blank', 'width=960,height=1100');
  if (!w) { alert('Pop-up blocked — please allow pop-ups for this site and try again.'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 600);
}

type CollectionParams = { routeId: string; dispatchDate: string; routeName: string; officeName: string; };

function buildCollectionHTML(data: any, routeName: string, officeName: string): string {
  const rows: any[] = data.rows || [];
  const fmt = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };
  const orderDate = data.orderDate ? fmt(data.orderDate) : fmt(data.dispatchDate || '');
  const deliverFor = data.dispatchDate ? fmt(data.dispatchDate) : '';
  const thS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#eef2ff;text-align:center;white-space:nowrap;';
  const tdS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:center;white-space:nowrap;';
  const tdLS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:left;';
  const tdRS = 'border:1px solid #ccc;padding:4px 7px;font-size:11px;text-align:right;font-weight:600;';
  const totS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#e0e7ff;text-align:right;';
  const totLS = 'border:1px solid #999;padding:5px 7px;font-size:11px;font-weight:700;background:#e0e7ff;text-align:center;';
  const modeCell = (mode: string) => {
    const color = mode === 'Cash' ? '#065f46' : mode === 'Razorpay' ? '#1d4ed8' : mode === 'Cashfree' ? '#7c3aed' : '#374151';
    return `<td style="${tdS}color:${color};font-weight:600;">${mode}</td>`;
  };
  const dataRows = rows.length === 0
    ? `<tr><td colspan="9" style="${tdS}color:#888;">No matched orders found for this date.</td></tr>`
    : rows.map((r: any) => `<tr>
        <td style="${tdS}">${r.sno}</td>
        <td style="${tdS}">${r.zone}</td>
        <td style="${tdS}">${(r.shift || 'morning').charAt(0).toUpperCase() + (r.shift || 'morning').slice(1)}</td>
        <td style="${tdS}">${r.boothCode}</td>
        <td style="${tdLS}">${r.agentName}</td>
        <td style="${tdS}">${r.orderId}</td>
        ${modeCell(r.paymentMode)}
        <td style="${tdRS}">₹${r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="${tdLS};font-size:10px;">${r.txnId || ''}</td>
      </tr>`).join('');
  const totalAmount = (data.summary?.totalAmount ?? rows.reduce((s: number, r: any) => s + (r.amount || 0), 0));
  const byMode: Record<string, number> = data.summary?.byMode ?? {};
  const modeBreakdown = Object.entries(byMode).map(([m, v]) => `${m}: ₹${(v as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`).join(' &nbsp;|&nbsp; ');
  const totalRow = `<tr>
    <td colspan="7" style="${totLS}">${modeBreakdown || 'TOTAL'}</td>
    <td style="${totS}">₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    <td style="${totLS}"></td>
  </tr>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>${officeName} — ${routeName} Collection Statement</title>
  <style>@page{size:A4 landscape;margin:10mm;}*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,Helvetica,sans-serif;}
  .header{text-align:center;margin-bottom:10px;border-bottom:2px solid #4338ca;padding-bottom:8px;}
  .header h1{font-size:15px;font-weight:bold;color:#4338ca;}.header h2{font-size:13px;font-weight:600;margin-top:2px;}
  .header p{font-size:11px;color:#555;margin-top:3px;}table{width:100%;border-collapse:collapse;}</style>
  </head><body>
  <div class="header"><h1>${officeName}</h1>
  <h2>Collection Statement — ${routeName}</h2>
  <p>Order Date: ${orderDate}${deliverFor ? ` &nbsp;|&nbsp; Deliver For: ${deliverFor}` : ''}</p></div>
  <table><thead><tr>
    <th style="${thS}">S.No</th><th style="${thS}">Zone</th><th style="${thS}">Shift</th>
    <th style="${thS}">Booth Code</th><th style="${thS};text-align:left;">Agent Name</th>
    <th style="${thS}">Order #</th><th style="${thS}">Payment Mode</th>
    <th style="${thS};text-align:right;">Amount (₹)</th><th style="${thS}">Txn ID</th>
  </tr></thead><tbody>${dataRows}${totalRow}</tbody></table>
  </body></html>`;
}

async function fetchCollectionData({ routeId, dispatchDate }: CollectionParams) {
  const res = await fetch(`/api/mmo/routes/${routeId}/collection-statement?date=${dispatchDate}`, { credentials: 'include' });
  if (!res.ok) { alert('Failed to fetch collection statement: ' + (await res.text())); return null; }
  return await res.json();
}

async function openCollectionStatementPDF(p: CollectionParams) {
  const data = await fetchCollectionData(p);
  if (!data) return;
  if (!data.rows?.length) { alert('No matched orders found for this date.'); return; }
  const html = buildCollectionHTML(data, p.routeName, p.officeName);
  const w = window.open('', '_blank', 'width=1100,height=850');
  if (!w) { alert('Pop-up blocked — please allow pop-ups and try again.'); return; }
  w.document.open(); w.document.write(html); w.document.close(); w.focus();
  setTimeout(() => w.print(), 600);
}

async function downloadCollectionStatement(p: CollectionParams) {
  const data = await fetchCollectionData(p);
  if (!data) return;
  const html = buildCollectionHTML(data, p.routeName, p.officeName);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Collection_${p.routeName.replace(/\s+/g, '_')}_${p.dispatchDate}.html`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function shareCollectionStatementWhatsApp(p: CollectionParams) {
  const data = await fetchCollectionData(p);
  if (!data) return;
  const rows: any[] = data.rows || [];
  const fmt = (d: string) => { const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };
  const orderDate = data.orderDate ? fmt(data.orderDate) : fmt(p.dispatchDate);
  let text = `*${p.officeName} — Collection Statement*\n`;
  text += `*Route:* ${p.routeName}\n*Order Date:* ${orderDate}\n\n`;
  rows.forEach((r: any) => {
    text += `${r.sno}. ${r.agentName} (${r.boothCode}) — ₹${r.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })} [${r.paymentMode}]`;
    if (r.txnId) text += ` Txn: ${r.txnId}`;
    text += '\n';
  });
  const byMode: Record<string, number> = data.summary?.byMode ?? {};
  if (Object.keys(byMode).length) {
    text += `\n*Summary:*\n`;
    Object.entries(byMode).forEach(([m, v]) => { text += `${m}: ₹${(v as number).toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`; });
  }
  const total = data.summary?.totalAmount ?? rows.reduce((s: number, r: any) => s + r.amount, 0);
  text += `*TOTAL: ₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}*`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function CollectionDropdown({ routeId, dispatchDate, routeName, officeName, iconOnly = false }: CollectionParams & { iconOnly?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {iconOnly
          ? <Button size="icon" variant="ghost" className="h-6 w-6 text-indigo-600" title="Collection Statement"><FileText className="h-3 w-3" /></Button>
          : <Button size="sm" variant="outline" className="text-indigo-700 border-indigo-400"><FileText className="h-3 w-3 mr-1" /> Collection <ChevronDown className="h-3 w-3 ml-1" /></Button>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => openCollectionStatementPDF({ routeId, dispatchDate, routeName, officeName })}>
          <Printer className="h-4 w-4 mr-2 text-indigo-600" /> Print / Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadCollectionStatement({ routeId, dispatchDate, routeName, officeName })}>
          <Download className="h-4 w-4 mr-2 text-indigo-600" /> Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => shareCollectionStatementWhatsApp({ routeId, dispatchDate, routeName, officeName })}>
          <Share2 className="h-4 w-4 mr-2 text-green-600" /> WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FreshMilkReport({ segData, shift, onShiftChange, dispatchDate, routeName, officeName, routeId, onDownload, onShare, onStatement }: {
  segData?: SegData;
  shift: 'combined' | 'morning' | 'evening';
  onShiftChange: (s: 'combined' | 'morning' | 'evening') => void;
  dispatchDate: string;
  routeName: string;
  officeName: string;
  routeId?: string;
  onDownload: () => void;
  onShare: () => void;
  onStatement?: () => void;
}) {
  if (!segData || segData.totalOrders === 0) {
    return <p className="text-sm text-muted-foreground p-4 text-center">No Fresh Milk orders for this dispatch date</p>;
  }

  const prods = segData.products;
  const agentsWithOrders = segData.agents.filter(a => agentHasShiftOrders(a, shift));

  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Milk className="h-5 w-5 text-green-600" />
          <span className="font-semibold">Fresh Milk</span>
          <Badge variant="outline">{segData.totalOrders} orders</Badge>
          <Badge variant="outline" className="text-green-700">₹{segData.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Badge>
        </div>
        <div className="flex items-center gap-2 no-print">
          <div className="flex rounded-lg border overflow-hidden">
            {(['morning', 'evening', 'combined'] as const).map(s => (
              <button key={s} onClick={() => onShiftChange(s)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${shift === s ? 'bg-green-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 hover:bg-gray-100'}`}>
                {s === 'morning' ? '☀️ Morning' : s === 'evening' ? '🌙 Evening' : '📋 Combined'}
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-3 w-3 mr-1" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={() => openPrintPreview({ segData: segData!, shift, segName: 'Fresh Milk', dispatchDate, routeName, officeName })}><Printer className="h-3 w-3 mr-1" /> Print Preview</Button>
          {onStatement && <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-400" onClick={onStatement}><Receipt className="h-3 w-3 mr-1" /> ₹ Statement</Button>}
          {routeId && <CollectionDropdown routeId={routeId} dispatchDate={dispatchDate} routeName={routeName} officeName={officeName} />}
          <Button size="sm" variant="outline" className="text-green-600" onClick={onShare}><Share2 className="h-3 w-3 mr-1" /> WhatsApp</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-green-50 dark:bg-green-950">
              <TableHead className="text-xs py-2 px-2 w-10">S.No</TableHead>
              <TableHead className="text-xs py-2 px-2 w-14">Code</TableHead>
              <TableHead className="text-xs py-2 px-2">Agent Name</TableHead>
              <TableHead className="text-xs py-2 px-2">Point Name</TableHead>
              {shift === 'combined' ? (
                prods.map(p => (
                  <TableHead key={p} className="text-xs py-2 px-1 text-center border-l" colSpan={2}>{shortProductName(p)}</TableHead>
                ))
              ) : (
                prods.map(p => (
                  <TableHead key={p} className="text-xs py-2 px-1 text-center border-l">{shortProductName(p)}</TableHead>
                ))
              )}
              {segName === 'Fresh Milk' && <TableHead className="text-xs py-2 px-2 text-center border-l text-blue-600">Orders Qty</TableHead>}
              {segName === 'Fresh Milk' && <TableHead className="text-xs py-2 px-2 text-center border-l text-gray-500">Sub Qty</TableHead>}
              {segName === 'Fresh Milk' && <TableHead className="text-xs py-2 px-2 text-center border-l text-green-700">Free Milk (L)</TableHead>}
              {segName === 'Fresh Milk' && <TableHead className="text-xs py-2 px-2 text-center border-l text-teal-700 font-bold">Total Qty</TableHead>}
              <TableHead className="text-xs py-2 px-2 text-right border-l">Value (₹)</TableHead>
            </TableRow>
            {shift === 'combined' && (
              <TableRow className="bg-green-50 dark:bg-green-950">
                <TableHead colSpan={4} className="py-1"></TableHead>
                {prods.map(p => (
                  <><TableHead key={`${p}-m`} className="text-xs py-1 px-1 text-center border-l bg-yellow-50 dark:bg-yellow-950">M</TableHead>
                  <TableHead key={`${p}-e`} className="text-xs py-1 px-1 text-center bg-blue-50 dark:bg-blue-950">E</TableHead></>
                ))}
                {segName === 'Fresh Milk' && <TableHead className="border-l py-1"></TableHead>}
                {segName === 'Fresh Milk' && <TableHead className="border-l py-1"></TableHead>}
                {segName === 'Fresh Milk' && <TableHead className="border-l py-1"></TableHead>}
                {segName === 'Fresh Milk' && <TableHead className="border-l py-1"></TableHead>}
                <TableHead className="border-l py-1"></TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {agentsWithOrders.map((a, idx) => (
              <TableRow key={a.agentId}>
                <TableCell className="text-xs py-1.5 px-2">{idx + 1}</TableCell>
                <TableCell className="text-xs py-1.5 px-2 font-mono">{a.agentCode}</TableCell>
                <TableCell className="text-xs py-1.5 px-2 font-medium">{a.agentName}</TableCell>
                <TableCell className="text-xs py-1.5 px-2 text-muted-foreground">{a.pointName}</TableCell>
                {shift === 'combined' ? (
                  prods.map(p => (
                    <><TableCell key={`${a.agentId}-${p}-m`} className="text-xs py-1.5 px-2 text-center border-l">{a.morning[p] || '—'}</TableCell>
                    <TableCell key={`${a.agentId}-${p}-e`} className="text-xs py-1.5 px-2 text-center">{a.evening[p] || '—'}</TableCell></>
                  ))
                ) : (
                  prods.map(p => {
                    const bucket = shift === 'morning' ? a.morning : a.evening;
                    return <TableCell key={`${a.agentId}-${p}`} className="text-xs py-1.5 px-2 text-center border-l">{bucket[p] || '—'}</TableCell>;
                  })
                )}
                {segName === 'Fresh Milk' && (
                  <TableCell className="text-xs py-1.5 px-2 text-center border-l text-blue-700">
                    {(a.ordersQty || 0) > 0 ? (a.ordersQty || 0).toFixed(1) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                )}
                {segName === 'Fresh Milk' && (
                  <TableCell className="text-xs py-1.5 px-2 text-center border-l text-gray-500">
                    {(a.subscriptionQty || 0) > 0 ? (a.subscriptionQty || 0).toFixed(1) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                )}
                {segName === 'Fresh Milk' && (
                  <TableCell className="text-xs py-1.5 px-2 text-center border-l">
                    {(a.freeMilkQty || 0) > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-green-700 font-semibold">{(a.freeMilkQty || 0).toFixed(1)}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                )}
                {segName === 'Fresh Milk' && (
                  <TableCell className="text-xs py-1.5 px-2 text-center border-l font-bold text-teal-700">
                    {(a.totalQty || 0) > 0 ? (a.totalQty || 0).toFixed(1) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                )}
                <TableCell className="text-xs py-1.5 px-2 text-right font-medium border-l">
                  ₹{(shift === 'morning' ? a.morningValue : shift === 'evening' ? a.eveningValue : a.totalValue).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-green-100 dark:bg-green-900 font-bold">
              <TableCell className="text-xs py-1.5 px-2 font-bold" colSpan={4}>TOTAL</TableCell>
              {shift === 'combined' ? (
                prods.map(p => (
                  <><TableCell key={`tot-${p}-m`} className="text-xs py-1.5 px-2 text-center border-l font-bold">{segData.productTotals[p]?.morning || 0}</TableCell>
                  <TableCell key={`tot-${p}-e`} className="text-xs py-1.5 px-2 text-center font-bold">{segData.productTotals[p]?.evening || 0}</TableCell></>
                ))
              ) : (
                prods.map(p => (
                  <TableCell key={`tot-${p}`} className="text-xs py-1.5 px-2 text-center border-l font-bold">{segData.productTotals[p]?.[shift] || 0}</TableCell>
                ))
              )}
              {segName === 'Fresh Milk' && (
                <TableCell className="text-xs py-1.5 px-2 text-center border-l font-bold text-blue-700">
                  {agentsWithOrders.reduce((s, a) => s + (a.ordersQty || 0), 0).toFixed(1)}
                </TableCell>
              )}
              {segName === 'Fresh Milk' && (
                <TableCell className="text-xs py-1.5 px-2 text-center border-l font-bold text-gray-500">
                  {agentsWithOrders.reduce((s, a) => s + (a.subscriptionQty || 0), 0).toFixed(1)}
                </TableCell>
              )}
              {segName === 'Fresh Milk' && (
                <TableCell className="text-xs py-1.5 px-2 text-center border-l font-bold text-green-700">
                  {agentsWithOrders.reduce((s, a) => s + (a.freeMilkQty || 0), 0).toFixed(1)}L
                </TableCell>
              )}
              {segName === 'Fresh Milk' && (
                <TableCell className="text-xs py-1.5 px-2 text-center border-l font-bold text-teal-700">
                  {agentsWithOrders.reduce((s, a) => s + (a.totalQty || 0), 0).toFixed(1)}
                </TableCell>
              )}
              <TableCell className="text-xs py-1.5 px-2 text-right font-bold border-l">
                ₹{(shift === 'combined' ? segData.totalValue : agentsWithOrders.reduce((s, a) => s + (shift === 'morning' ? a.morningValue : a.eveningValue), 0)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MorningOnlyReport({ segName, segData, dispatchDate, routeName, officeName, onDownload, onShare }: {
  segName: string;
  segData?: SegData;
  dispatchDate: string;
  routeName: string;
  officeName: string;
  onDownload: () => void;
  onShare: () => void;
}) {
  if (!segData || segData.totalOrders === 0) {
    return <p className="text-sm text-muted-foreground p-4 text-center">No {segName} orders for this dispatch date</p>;
  }

  const prods = segData.products;
  const agentsWithOrders = segData.agents.filter(a => agentHasShiftOrders(a, 'morning'));
  const icon = segName === 'Products' ? <Package className="h-5 w-5 text-blue-600" /> : <IceCream2 className="h-5 w-5 text-purple-600" />;
  const bgColor = segName === 'Products' ? 'bg-blue-50 dark:bg-blue-950' : 'bg-purple-50 dark:bg-purple-950';
  const totalBgColor = segName === 'Products' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-purple-100 dark:bg-purple-900';

  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold">{segName}</span>
          <Badge variant="outline">{segData.totalOrders} orders</Badge>
          <Badge variant="outline" className="text-green-700">₹{segData.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</Badge>
          <Badge variant="secondary" className="text-[10px]">Morning Only</Badge>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-3 w-3 mr-1" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={() => openPrintPreview({ segData: segData!, shift: 'morning', segName, dispatchDate, routeName, officeName })}><Printer className="h-3 w-3 mr-1" /> Print Preview</Button>
          <Button size="sm" variant="outline" className="text-green-600" onClick={onShare}><Share2 className="h-3 w-3 mr-1" /> WhatsApp</Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className={bgColor}>
              <TableHead className="text-xs py-2 px-2 w-10">S.No</TableHead>
              <TableHead className="text-xs py-2 px-2 w-14">Code</TableHead>
              <TableHead className="text-xs py-2 px-2">Agent Name</TableHead>
              <TableHead className="text-xs py-2 px-2">Point Name</TableHead>
              {prods.map(p => (
                <TableHead key={p} className="text-xs py-2 px-1 text-center border-l">{shortProductName(p)}</TableHead>
              ))}
              <TableHead className="text-xs py-2 px-2 text-right border-l">Value (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agentsWithOrders.map((a, idx) => (
              <TableRow key={a.agentId}>
                <TableCell className="text-xs py-1.5 px-2">{idx + 1}</TableCell>
                <TableCell className="text-xs py-1.5 px-2 font-mono">{a.agentCode}</TableCell>
                <TableCell className="text-xs py-1.5 px-2 font-medium">{a.agentName}</TableCell>
                <TableCell className="text-xs py-1.5 px-2 text-muted-foreground">{a.pointName}</TableCell>
                {prods.map(p => (
                  <TableCell key={`${a.agentId}-${p}`} className="text-xs py-1.5 px-2 text-center border-l">{a.morning[p] || '—'}</TableCell>
                ))}
                <TableCell className="text-xs py-1.5 px-2 text-right font-medium border-l">₹{a.morningValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
              </TableRow>
            ))}
            <TableRow className={`${totalBgColor} font-bold`}>
              <TableCell className="text-xs py-1.5 px-2 font-bold" colSpan={4}>TOTAL</TableCell>
              {prods.map(p => (
                <TableCell key={`tot-${p}`} className="text-xs py-1.5 px-2 text-center border-l font-bold">{segData.productTotals[p]?.morning || 0}</TableCell>
              ))}
              <TableCell className="text-xs py-1.5 px-2 text-right font-bold border-l">₹{segData.totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
