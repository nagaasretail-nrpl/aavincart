import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Filter,
  Search,
  Percent,
  Package,
  BarChart3,
} from "lucide-react";

interface Scheme {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  schemeType: string;
  discountType: string;
  discountValue: number;
  minQuantity?: number;
  minValue?: number;
  maxDiscount?: number;
  freeProductId?: string;
  freeProductQty?: number;
  applicableRoles: string[];
  segment: string;
  startDate: string;
  endDate: string;
  budgetAmount: number;
  budgetUsed: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SchemeFormData {
  name: string;
  description: string;
  schemeType: string;
  discountType: string;
  discountValue: number;
  minQuantity: number;
  minValue: number;
  maxDiscount: number;
  freeProductId: string;
  freeProductQty: number;
  applicableRoles: string[];
  segment: string;
  startDate: string;
  endDate: string;
  budgetAmount: number;
  isActive: boolean;
}

const SCHEME_TYPES = [
  { value: "quantity_based", label: "Quantity Based" },
  { value: "value_based", label: "Value Based" },
  { value: "buy_x_get_y", label: "Buy X Get Y" },
  { value: "flat_discount", label: "Flat Discount" },
  { value: "percentage_discount", label: "Percentage Discount" },
];

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage" },
  { value: "flat", label: "Flat Amount" },
  { value: "free_product", label: "Free Product" },
];

const APPLICABLE_ROLES = ["WSD", "Dealer", "Retailer", "FMD", "Institution"];

const SEGMENTS = [
  { value: "All", label: "All Segments" },
  { value: "Fresh Milk", label: "Fresh Milk" },
  { value: "Products", label: "Products" },
  { value: "Ice Cream", label: "Ice Cream" },
];

const defaultFormData: SchemeFormData = {
  name: "",
  description: "",
  schemeType: "percentage_discount",
  discountType: "percentage",
  discountValue: 0,
  minQuantity: 0,
  minValue: 0,
  maxDiscount: 0,
  freeProductId: "",
  freeProductQty: 0,
  applicableRoles: [],
  segment: "All",
  startDate: "",
  endDate: "",
  budgetAmount: 0,
  isActive: true,
};

function getSchemeTypeLabel(type: string) {
  return SCHEME_TYPES.find((t) => t.value === type)?.label || type;
}

function getStatusBadge(scheme: Scheme) {
  const now = new Date();
  const end = new Date(scheme.endDate);
  if (!scheme.isActive) {
    return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Inactive</Badge>;
  }
  if (end < now) {
    return <Badge variant="destructive">Expired</Badge>;
  }
  return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
}

function getSchemeStatus(scheme: Scheme): "active" | "inactive" | "expired" {
  const now = new Date();
  const end = new Date(scheme.endDate);
  if (!scheme.isActive) return "inactive";
  if (end < now) return "expired";
  return "active";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DMSSchemes() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);
  const [formData, setFormData] = useState<SchemeFormData>(defaultFormData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const merchantId = user?.unionId || user?.id || "";

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (user.role !== "admin") {
      toast({
        title: "Access Denied",
        description: "This page is for admins only",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  const { data: schemesData, isLoading, refetch } = useQuery<Scheme[]>({
    queryKey: ["/api/schemes", merchantId],
    enabled: !!user && user.role === "admin" && !!merchantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: SchemeFormData) => {
      return apiRequest("POST", "/api/schemes", { ...data, merchantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schemes", merchantId] });
      toast({ title: "Success", description: "Scheme created successfully" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create scheme",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SchemeFormData> }) => {
      return apiRequest("PATCH", `/api/schemes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schemes", merchantId] });
      toast({ title: "Success", description: "Scheme updated successfully" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update scheme",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/schemes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schemes", merchantId] });
      toast({ title: "Success", description: "Scheme deactivated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate scheme",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/schemes/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schemes", merchantId] });
      toast({ title: "Success", description: "Scheme status updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update scheme status",
        variant: "destructive",
      });
    },
  });

  const schemes = schemesData || [];

  const filteredSchemes = schemes.filter((scheme) => {
    const matchesSearch =
      scheme.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (scheme.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const status = getSchemeStatus(scheme);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    const matchesType = typeFilter === "all" || scheme.schemeType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalSchemes = schemes.length;
  const activeSchemes = schemes.filter((s) => getSchemeStatus(s) === "active").length;
  const expiredSchemes = schemes.filter((s) => getSchemeStatus(s) === "expired").length;
  const totalBudget = schemes.reduce((sum, s) => sum + (s.budgetAmount || 0), 0);
  const totalBudgetUsed = schemes.reduce((sum, s) => sum + (s.budgetUsed || 0), 0);
  const budgetUtilization = totalBudget > 0 ? Math.round((totalBudgetUsed / totalBudget) * 100) : 0;

  function closeDialog() {
    setDialogOpen(false);
    setEditingScheme(null);
    setFormData(defaultFormData);
  }

  function openCreateDialog() {
    setEditingScheme(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  }

  function openEditDialog(scheme: Scheme) {
    setEditingScheme(scheme);
    setFormData({
      name: scheme.name,
      description: scheme.description || "",
      schemeType: scheme.schemeType,
      discountType: scheme.discountType,
      discountValue: scheme.discountValue,
      minQuantity: scheme.minQuantity || 0,
      minValue: scheme.minValue || 0,
      maxDiscount: scheme.maxDiscount || 0,
      freeProductId: scheme.freeProductId || "",
      freeProductQty: scheme.freeProductQty || 0,
      applicableRoles: scheme.applicableRoles || [],
      segment: scheme.segment || "All",
      startDate: scheme.startDate ? scheme.startDate.split("T")[0] : "",
      endDate: scheme.endDate ? scheme.endDate.split("T")[0] : "",
      budgetAmount: scheme.budgetAmount || 0,
      isActive: scheme.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: "Validation Error", description: "Scheme name is required", variant: "destructive" });
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      toast({ title: "Validation Error", description: "Start and end dates are required", variant: "destructive" });
      return;
    }
    if (editingScheme) {
      updateMutation.mutate({ id: editingScheme.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  function handleRoleToggle(role: string) {
    setFormData((prev) => ({
      ...prev,
      applicableRoles: prev.applicableRoles.includes(role)
        ? prev.applicableRoles.filter((r) => r !== role)
        : [...prev.applicableRoles, role],
    }));
  }

  if (!user || user.role !== "admin") return null;

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Tag className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">DMS Scheme Management</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Create and manage distribution schemes</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Scheme
          </Button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm">Total Schemes</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalSchemes}</p>
                </div>
                <Tag className="h-6 w-6 sm:h-10 sm:w-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-xs sm:text-sm">Active Schemes</p>
                  <p className="text-xl sm:text-2xl font-bold">{activeSchemes}</p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-10 sm:w-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-xs sm:text-sm">Expired Schemes</p>
                  <p className="text-xl sm:text-2xl font-bold">{expiredSchemes}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-10 sm:w-10 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs sm:text-sm">Budget Utilized</p>
                  <p className="text-xl sm:text-2xl font-bold">{budgetUtilization}%</p>
                </div>
                <BarChart3 className="h-6 w-6 sm:h-10 sm:w-10 text-purple-200" />
              </div>
              <Progress value={budgetUtilization} className="mt-2 h-2 bg-white/30" />
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search schemes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Scheme Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {SCHEME_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p>Loading schemes...</p>
            </CardContent>
          </Card>
        ) : filteredSchemes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Schemes Found</h3>
              <p className="text-muted-foreground mb-4">
                {schemes.length === 0
                  ? "Create your first distribution scheme to get started."
                  : "No schemes match your current filters."}
              </p>
              {schemes.length === 0 && (
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Scheme
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchemes.map((scheme) => {
              const budgetPercent =
                scheme.budgetAmount > 0
                  ? Math.round((scheme.budgetUsed / scheme.budgetAmount) * 100)
                  : 0;

              return (
                <Card key={scheme.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{scheme.name}</CardTitle>
                        {scheme.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {scheme.description}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(scheme)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline">{getSchemeTypeLabel(scheme.schemeType)}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium">
                        {scheme.discountType === "percentage" ? (
                          <span className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            {scheme.discountValue}%
                          </span>
                        ) : scheme.discountType === "free_product" ? (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Free Product
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(scheme.discountValue)}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valid Period</span>
                      <span className="text-xs">
                        {formatDate(scheme.startDate)} - {formatDate(scheme.endDate)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Segment</span>
                      <span>{scheme.segment || "All"}</span>
                    </div>

                    <div className="text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">Budget</span>
                        <span className="text-xs font-medium">
                          {formatCurrency(scheme.budgetUsed || 0)} / {formatCurrency(scheme.budgetAmount || 0)}
                        </span>
                      </div>
                      <Progress value={budgetPercent} className="h-2" />
                      <p className="text-xs text-right text-muted-foreground mt-1">{budgetPercent}% used</p>
                    </div>

                    {scheme.applicableRoles && scheme.applicableRoles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {scheme.applicableRoles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={scheme.isActive}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: scheme.id, isActive: checked })
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {scheme.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(scheme)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => deactivateMutation.mutate(scheme.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingScheme ? "Edit Scheme" : "Create New Scheme"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">Scheme Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Enter scheme name"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Scheme description"
                  rows={2}
                />
              </div>

              <div>
                <Label>Scheme Type *</Label>
                <Select
                  value={formData.schemeType}
                  onValueChange={(v) => setFormData((p) => ({ ...p, schemeType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEME_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Discount Type *</Label>
                <Select
                  value={formData.discountType}
                  onValueChange={(v) => setFormData((p) => ({ ...p, discountType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.discountType !== "free_product" && (
                <div>
                  <Label htmlFor="discountValue">
                    Discount Value {formData.discountType === "percentage" ? "(%)" : "(₹)"}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, discountValue: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              )}

              {formData.schemeType === "quantity_based" && (
                <div>
                  <Label htmlFor="minQuantity">Minimum Quantity</Label>
                  <Input
                    id="minQuantity"
                    type="number"
                    min="0"
                    value={formData.minQuantity}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, minQuantity: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              )}

              {formData.schemeType === "value_based" && (
                <div>
                  <Label htmlFor="minValue">Minimum Value (₹)</Label>
                  <Input
                    id="minValue"
                    type="number"
                    min="0"
                    value={formData.minValue}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, minValue: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="maxDiscount">Max Discount Cap (₹)</Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  min="0"
                  value={formData.maxDiscount}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, maxDiscount: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              {formData.schemeType === "buy_x_get_y" && (
                <>
                  <div>
                    <Label htmlFor="freeProductId">Free Product ID</Label>
                    <Input
                      id="freeProductId"
                      value={formData.freeProductId}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, freeProductId: e.target.value }))
                      }
                      placeholder="Product ID"
                    />
                  </div>
                  <div>
                    <Label htmlFor="freeProductQty">Free Product Quantity</Label>
                    <Input
                      id="freeProductQty"
                      type="number"
                      min="0"
                      value={formData.freeProductQty}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, freeProductQty: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Segment</Label>
                <Select
                  value={formData.segment}
                  onValueChange={(v) => setFormData((p) => ({ ...p, segment: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="budgetAmount">Budget Amount (₹)</Label>
                <Input
                  id="budgetAmount"
                  type="number"
                  min="0"
                  value={formData.budgetAmount}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, budgetAmount: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Label className="mb-3 block">Applicable Roles</Label>
                <div className="flex flex-wrap gap-4">
                  {APPLICABLE_ROLES.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${role}`}
                        checked={formData.applicableRoles.includes(role)}
                        onCheckedChange={() => handleRoleToggle(role)}
                      />
                      <Label htmlFor={`role-${role}`} className="text-sm font-normal cursor-pointer">
                        {role}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((p) => ({ ...p, isActive: checked }))
                    }
                  />
                  <Label htmlFor="isActive">Scheme is Active</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingScheme
                ? "Update Scheme"
                : "Create Scheme"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
