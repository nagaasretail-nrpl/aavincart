import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Users, Upload, Plus, Trash2, Edit, Download, Search, Filter, CheckCircle, Clock, XCircle, Tag } from "lucide-react";

const AGENT_CATEGORIES = [
  { value: "AGENT", label: "Agent" },
  { value: "HOTELS", label: "Hotels" },
  { value: "INSTUTION", label: "Institution" },
  { value: "PRIVATE_PARLOUR", label: "Private Parlour" },
  { value: "UNION_PARLOUR", label: "Union Parlour" },
  { value: "WSD", label: "Wholesale Dealer (WSD)" },
];

const PRICING_TIERS = [
  { value: "MRP", label: "Consumer (MRP) - 100%" },
  { value: "DLR", label: "Dealer (DLR) - 85%" },
  { value: "RTL", label: "Retailer (RTL)" },
  { value: "WSD", label: "Wholesale Dealer (WSD) - 65%" },
  { value: "INT", label: "Inter Union (INT) - 55%" },
  { value: "FED", label: "Federation (FED) - 50%" },
];


interface Agent {
  id: string;
  agentCode: string;
  agentType: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  pincode?: string;
  assignedUnionId?: string;
  officeId?: string;
  routeNumber?: string;
  routeName?: string;
  agentPoint?: string;
  freshMilkTier: string;
  productTier: string;
  iceCreamTier?: string;
  pricingRole: string;
  status: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankName?: string;
  canDeliver: boolean;
  gstNumber?: string;
  createdAt: string;
}

export default function AdminAgents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterUnion, setFilterUnion] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState("");
  const [importResults, setImportResults] = useState<any>(null);

  const [newAgent, setNewAgent] = useState({
    agentCode: "",
    agentType: "INSTUTION",
    name: "",
    phone: "",
    alternatePhone: "",
    email: "",
    address: "",
    city: "",
    district: "",
    pincode: "",
    assignedUnionId: "",
    officeId: "",
    routeNumber: "",
    routeName: "",
    agentPoint: "",
    freshMilkTier: "MRP",
    productTier: "MRP",
    iceCreamTier: "DEALER",
    pricingRole: "MRP",
    bankAccountName: "",
    bankAccountNumber: "",
    bankIfscCode: "",
    bankName: "",
    canDeliver: false,
    gstNumber: "",
  });

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/admin/agents"],
  });

  const { data: unions = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/restaurants"],
    select: (data: any[]) => data.map(r => ({ id: r.id, name: r.name })).sort((a, b) => a.name.localeCompare(b.name)),
  });

  const createAgentMutation = useMutation({
    mutationFn: async (agent: typeof newAgent) => {
      const response = await apiRequest("POST", "/api/admin/agents", agent);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({ title: "Agent created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating agent", description: error.message, variant: "destructive" });
    },
  });

  const deleteAgentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      setIsDeleteDialogOpen(false);
      setAgentToDelete(null);
      toast({ title: "Agent deleted successfully" });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async (agent: Partial<Agent> & { id: string }) => {
      const response = await apiRequest("PUT", `/api/admin/agents/${agent.id}`, agent);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      setIsEditDialogOpen(false);
      setEditingAgent(null);
      toast({ title: "Agent updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating agent", description: error.message, variant: "destructive" });
    },
  });

  const getUnionNameById = (unionId: string | undefined) => {
    if (!unionId) return "Not Assigned";
    const union = unions.find(u => u.id === unionId);
    if (union) return union.name;
    return "Unknown Union";
  };

  const findUnionIdByDistrict = (district: string | undefined) => {
    if (!district) return "";
    const districtLower = district.toLowerCase();
    const union = unions.find(u => u.name.toLowerCase().includes(districtLower));
    return union?.id || "";
  };

  const handleEdit = (agent: Agent) => {
    let unionId = agent.assignedUnionId || "";
    const existsInUnions = unions.some(u => u.id === unionId);
    if (!existsInUnions && agent.district) {
      unionId = findUnionIdByDistrict(agent.district);
    }
    setEditingAgent({ ...agent, assignedUnionId: unionId });
    setIsEditDialogOpen(true);
  };

  const handleDeleteConfirm = (agent: Agent) => {
    setAgentToDelete(agent);
    setIsDeleteDialogOpen(true);
  };

  const activateAgentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/agents/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      toast({ title: "Agent status updated" });
    },
  });

  const importAgentsMutation = useMutation({
    mutationFn: async (agents: any[]) => {
      const response = await apiRequest("POST", "/api/admin/agents/import", { agents });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents"] });
      setImportResults(data);
      toast({ title: `Imported ${data.success} agents`, description: `${data.failed} failed` });
    },
    onError: (error: any) => {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setNewAgent({
      agentCode: "",
      agentType: "INSTUTION",
      name: "",
      phone: "",
      alternatePhone: "",
      email: "",
      address: "",
      city: "",
      district: "",
      pincode: "",
      assignedUnionId: "",
      officeId: "",
      routeNumber: "",
      routeName: "",
      agentPoint: "",
      freshMilkTier: "MRP",
      productTier: "MRP",
      iceCreamTier: "DEALER",
      pricingRole: "MRP",
      bankAccountName: "",
      bankAccountNumber: "",
      bankIfscCode: "",
      bankName: "",
      canDeliver: false,
      gstNumber: "",
    });
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const agents = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim());
      const agent: any = {};

      headers.forEach((header, idx) => {
        const value = values[idx] || "";
        switch (header) {
          case "agent_code":
          case "agentcode":
          case "code":
            agent.agentCode = value;
            break;
          case "agent_type":
          case "agenttype":
          case "type":
          case "category":
            agent.agentType = value.toUpperCase();
            break;
          case "name":
          case "agent_name":
            agent.name = value;
            break;
          case "phone":
          case "mobile":
          case "contact":
            agent.phone = value;
            break;
          case "agent_point":
          case "point":
            agent.agentPoint = value;
            break;
          case "route":
          case "route_name":
            agent.routeName = value;
            break;
          case "route_number":
          case "route_n":
            agent.routeNumber = value;
            break;
          case "office":
          case "office_id":
            agent.officeId = value;
            break;
          case "fresh_milk_tier":
          case "fresh_milk_type":
          case "fresh_milk":
            agent.freshMilkTier = value.toUpperCase();
            break;
          case "product_tier":
          case "product_type":
          case "product":
            agent.productTier = value.toUpperCase();
            break;
          case "union":
          case "union_id":
          case "assigned_union":
            agent.assignedUnionId = value.toLowerCase();
            break;
          case "district":
            agent.district = value;
            break;
        }
      });

      if (agent.agentCode && agent.name && agent.phone) {
        agents.push(agent);
      }
    }

    return agents;
  };

  const handleImport = () => {
    const parsedAgents = parseCSV(importData);
    if (parsedAgents.length === 0) {
      toast({ title: "No valid agents found in CSV", variant: "destructive" });
      return;
    }
    importAgentsMutation.mutate(parsedAgents);
  };

  const downloadSampleCSV = () => {
    const csv = `agent_code,category,name,phone,agent_point,route,route_number,office,fresh_milk_tier,product_tier,union,district
001,INSTUTION,The Superintendent,9843777277,ESI Hospital,Steel Plant I,2,CITY MMO OFFICE,MRP,MRP,salem,Salem
002,UNION_PARLOUR,MGR Baradha Rathn,9843777278,ANew BUS STAND-2 (P),Horeca,64,CITY MMO OFFICE,MRP,WSD,salem,Salem
003,WSD,NEW BUS POONGA PARLOUR,9843777279,,Horeca,64,CITY MMO OFFICE,MRP,WSD,salem,Salem`;
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agents_sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.phone.includes(searchTerm);
    const matchesType = filterType === "all" || agent.agentType === filterType;
    const matchesStatus = filterStatus === "all" || agent.status === filterStatus;
    const matchesUnion = filterUnion === "all" || agent.assignedUnionId === filterUnion;
    return matchesSearch && matchesType && matchesStatus && matchesUnion;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
      case "claimed":
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" /> Claimed</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case "inactive":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      FED: "bg-purple-100 text-purple-800",
      INT: "bg-blue-100 text-blue-800",
      WSD: "bg-green-100 text-green-800",
      DLR: "bg-yellow-100 text-yellow-800",
      RTL: "bg-orange-100 text-orange-800",
      MRP: "bg-gray-100 text-gray-800",
    };
    return <Badge className={colors[tier] || ""}>{tier}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-full overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Agent Management
            </h1>
            <p className="text-gray-500">Manage agents with tri-segment pricing (Fresh Milk / Products / Ice Cream)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              window.open('/api/admin/agents/download-csv', '_blank');
            }}>
              <Download className="h-4 w-4 mr-2" />
              Download All B2B Users
            </Button>
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Import Agents from CSV</DialogTitle>
                  <DialogDescription>
                    Paste your CSV data below. Use columns: agent_code, category, name, phone, agent_point, route, route_number, office, fresh_milk_tier, product_tier, union
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Button variant="outline" size="sm" onClick={downloadSampleCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample CSV
                  </Button>
                  <div>
                    <Label>CSV Data</Label>
                    <textarea
                      className="w-full h-48 p-3 border rounded-md font-mono text-sm"
                      placeholder="Paste your CSV data here..."
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                    />
                  </div>
                  {importResults && (
                    <Alert>
                      <AlertDescription>
                        <p className="font-semibold">Import Results:</p>
                        <p>✓ {importResults.success} agents imported successfully</p>
                        {importResults.failed > 0 && (
                          <>
                            <p>✗ {importResults.failed} failed</p>
                            {importResults.errors?.slice(0, 5).map((err: any, idx: number) => (
                              <p key={idx} className="text-sm text-red-600">Row {err.row}: {err.error}</p>
                            ))}
                          </>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleImport} disabled={importAgentsMutation.isPending}>
                    {importAgentsMutation.isPending ? "Importing..." : "Import"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agent
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <Plus className="h-5 w-5 text-orange-500" />
                    Add New Agent
                  </DialogTitle>
                  <DialogDescription>
                    Create agent account. Agent will claim it using their code.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Basic Info Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6 border border-blue-100 dark:border-blue-900">
                    <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent Code *</Label>
                        <Input
                          placeholder="001"
                          value={newAgent.agentCode}
                          onChange={(e) => setNewAgent({ ...newAgent, agentCode: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500">Used for login</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category *</Label>
                        <Select value={newAgent.agentType} onValueChange={(v) => setNewAgent({ ...newAgent, agentType: v })}>
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AGENT_CATEGORIES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">District Union *</Label>
                        <Select value={newAgent.assignedUnionId} onValueChange={(v) => setNewAgent({ ...newAgent, assignedUnionId: v })}>
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <SelectValue placeholder="Select Union" />
                          </SelectTrigger>
                          <SelectContent>
                            {unions.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name *</Label>
                        <Input
                          placeholder="Agent Name / Institution Name"
                          value={newAgent.name}
                          onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone *</Label>
                        <Input
                          placeholder="9843777277"
                          value={newAgent.phone}
                          onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Organization Details Section */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-6 border border-green-100 dark:border-green-900">
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4 flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Organization Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Office</Label>
                        <Input
                          placeholder="CITY MMO OFFICE"
                          value={newAgent.officeId}
                          onChange={(e) => setNewAgent({ ...newAgent, officeId: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Route Name</Label>
                        <Input
                          placeholder="Steel Plant I"
                          value={newAgent.routeName}
                          onChange={(e) => setNewAgent({ ...newAgent, routeName: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Route Number</Label>
                        <Input
                          placeholder="2"
                          value={newAgent.routeNumber}
                          onChange={(e) => setNewAgent({ ...newAgent, routeNumber: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent Point</Label>
                        <Input
                          placeholder="ESI Hospital, GMK Men's Hostel..."
                          value={newAgent.agentPoint}
                          onChange={(e) => setNewAgent({ ...newAgent, agentPoint: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">District</Label>
                        <Input
                          placeholder="Salem"
                          value={newAgent.district}
                          onChange={(e) => setNewAgent({ ...newAgent, district: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Tiers Section */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-6 border border-purple-100 dark:border-purple-900">
                    <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-4 flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Pricing Tiers (Tri-Segment Pricing)
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Set different pricing for Fresh Milk, Products, and Ice Cream segments</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">🥛 Fresh Milk Tier</Label>
                        <Select value={newAgent.freshMilkTier} onValueChange={(v) => setNewAgent({ ...newAgent, freshMilkTier: v })}>
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICING_TIERS.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">📦 Product Tier</Label>
                        <Select value={newAgent.productTier} onValueChange={(v) => setNewAgent({ ...newAgent, productTier: v })}>
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICING_TIERS.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">🍦 Ice Cream Tier</Label>
                        <Select value={newAgent.iceCreamTier || 'DEALER'} onValueChange={(v) => setNewAgent({ ...newAgent, iceCreamTier: v })}>
                          <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICING_TIERS.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                          <strong>Tip:</strong> Fresh Milk at MRP, Products at WSD
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bank Details Section */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-6 border border-amber-100 dark:border-amber-900">
                    <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Bank Details (Optional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Name</Label>
                        <Input
                          value={newAgent.bankAccountName}
                          onChange={(e) => setNewAgent({ ...newAgent, bankAccountName: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</Label>
                        <Input
                          value={newAgent.bankAccountNumber}
                          onChange={(e) => setNewAgent({ ...newAgent, bankAccountNumber: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">IFSC Code</Label>
                        <Input
                          placeholder="SBIN0001234"
                          value={newAgent.bankIfscCode}
                          onChange={(e) => setNewAgent({ ...newAgent, bankIfscCode: e.target.value })}
                          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6 gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={() => createAgentMutation.mutate(newAgent)} 
                    disabled={createAgentMutation.isPending}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  >
                    {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, code, phone..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-44">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {AGENT_CATEGORIES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="claimed">Claimed</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterUnion} onValueChange={setFilterUnion}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="District Union" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Unions</SelectItem>
                    {unions.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-gray-500">
                {filteredAgents.length} of {agents.length} agents
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading agents...</div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No agents found</p>
                <p className="text-sm">Add agents manually or import from CSV</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Office</TableHead>
                      <TableHead>🥛 Fresh Milk</TableHead>
                      <TableHead>📦 Product</TableHead>
                      <TableHead>🍦 Ice Cream</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-mono font-bold">{agent.agentCode}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{agent.agentType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{agent.name}</div>
                            {agent.agentPoint && <div className="text-xs text-gray-500">{agent.agentPoint}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {agent.routeName && (
                            <div className="text-sm">
                              {agent.routeName}
                              {agent.routeNumber && <span className="text-gray-500"> (#{agent.routeNumber})</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{agent.officeId || "-"}</TableCell>
                        <TableCell>{getTierBadge(agent.freshMilkTier)}</TableCell>
                        <TableCell>{getTierBadge(agent.productTier)}</TableCell>
                        <TableCell>{getTierBadge(agent.iceCreamTier || 'DEALER')}</TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {agent.status === "claimed" && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-green-600"
                                title="Activate Agent"
                                onClick={() => activateAgentMutation.mutate({ id: agent.id, status: "active" })}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              title="Edit Agent"
                              onClick={() => handleEdit(agent)}
                            >
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              title="Delete Agent"
                              onClick={() => handleDeleteConfirm(agent)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Agent Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Edit className="h-5 w-5 text-blue-500" />
                Edit Agent
              </DialogTitle>
              <DialogDescription>
                Update agent details. Changes will be saved immediately.
              </DialogDescription>
            </DialogHeader>
            {editingAgent && (
              <div className="space-y-6">
                {/* Basic Info Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-6 border border-blue-100 dark:border-blue-900">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent Code</Label>
                      <Input
                        value={editingAgent.agentCode}
                        onChange={(e) => setEditingAgent({ ...editingAgent, agentCode: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500">Used for login</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</Label>
                      <Select value={editingAgent.agentType} onValueChange={(v) => setEditingAgent({ ...editingAgent, agentType: v })}>
                        <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AGENT_CATEGORIES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">District Union</Label>
                      <Select value={editingAgent.assignedUnionId || ""} onValueChange={(v) => setEditingAgent({ ...editingAgent, assignedUnionId: v })}>
                        <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue placeholder="Select Union" />
                        </SelectTrigger>
                        <SelectContent>
                          {unions.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</Label>
                      <Input
                        value={editingAgent.name}
                        onChange={(e) => setEditingAgent({ ...editingAgent, name: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</Label>
                      <Input
                        value={editingAgent.phone}
                        onChange={(e) => setEditingAgent({ ...editingAgent, phone: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Organization Details Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-6 border border-green-100 dark:border-green-900">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-4 flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Organization Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Office</Label>
                      <Input
                        value={editingAgent.officeId || ""}
                        onChange={(e) => setEditingAgent({ ...editingAgent, officeId: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Route Name</Label>
                      <Input
                        value={editingAgent.routeName || ""}
                        onChange={(e) => setEditingAgent({ ...editingAgent, routeName: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Route Number</Label>
                      <Input
                        value={editingAgent.routeNumber || ""}
                        onChange={(e) => setEditingAgent({ ...editingAgent, routeNumber: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent Point</Label>
                      <Input
                        value={editingAgent.agentPoint || ""}
                        onChange={(e) => setEditingAgent({ ...editingAgent, agentPoint: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">District</Label>
                      <Input
                        value={editingAgent.district || ""}
                        onChange={(e) => setEditingAgent({ ...editingAgent, district: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Pricing Tiers Section */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-6 border border-purple-100 dark:border-purple-900">
                  <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-4 flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Pricing Tiers (Tri-Segment Pricing)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Set different pricing for Fresh Milk, Products, and Ice Cream segments</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">🥛 Fresh Milk Tier</Label>
                      <Select value={editingAgent.freshMilkTier} onValueChange={(v) => setEditingAgent({ ...editingAgent, freshMilkTier: v })}>
                        <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRICING_TIERS.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">📦 Product Tier</Label>
                      <Select value={editingAgent.productTier} onValueChange={(v) => setEditingAgent({ ...editingAgent, productTier: v })}>
                        <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRICING_TIERS.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">🍦 Ice Cream Tier</Label>
                      <Select value={editingAgent.iceCreamTier || 'DEALER'} onValueChange={(v) => setEditingAgent({ ...editingAgent, iceCreamTier: v })}>
                        <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRICING_TIERS.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                        <strong>Tip:</strong> Fresh Milk at MRP, Products at WSD
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Details Section */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-6 border border-amber-100 dark:border-amber-900">
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Bank Details (Optional)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Name</Label>
                      <Input
                        value={editingAgent.bankAccountName || ""}
                        onChange={(e) => setEditingAgent({ ...editingAgent, bankAccountName: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Number</Label>
                      <Input
                        value={editingAgent.bankAccountNumber || ""}
                        onChange={(e) => setEditingAgent({ ...editingAgent, bankAccountNumber: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">IFSC Code</Label>
                      <Input
                        value={editingAgent.bankIfscCode || ""}
                        onChange={(e) => setEditingAgent({ ...editingAgent, bankIfscCode: e.target.value })}
                        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => editingAgent && updateAgentMutation.mutate(editingAgent)} 
                disabled={updateAgentMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateAgentMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Agent
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this agent? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {agentToDelete && (
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 border border-red-200 dark:border-red-900">
                <p className="font-semibold text-red-800 dark:text-red-200">{agentToDelete.name}</p>
                <p className="text-sm text-red-600 dark:text-red-400">Code: {agentToDelete.agentCode}</p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => agentToDelete && deleteAgentMutation.mutate(agentToDelete.id)}
                disabled={deleteAgentMutation.isPending}
              >
                {deleteAgentMutation.isPending ? "Deleting..." : "Delete Agent"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}