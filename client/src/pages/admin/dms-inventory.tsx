import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Warehouse, Search, Edit, Save, X, ArrowLeft,
  RefreshCw, Package, AlertTriangle, Clock, Plus,
  Layers, ShieldAlert, CalendarClock, ChevronDown
} from "lucide-react";

interface InventoryBatch {
  id: string;
  merchantId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  manufacturingDate: string | null;
  expiryDate: string | null;
  quantity: number;
  damagedQty: number;
  unitType: string | null;
  costPrice: string | null;
  sellingPrice: string | null;
  stockNorm: number | null;
  reorderLevel: number | null;
  minOrderQty: number | null;
  warehouseLocation: string | null;
  segment: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AlertsData {
  reorderAlerts: InventoryBatch[];
  expiryAlerts: InventoryBatch[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getExpiryColor(dateStr: string | null): string {
  if (!dateStr) return "text-muted-foreground";
  const now = new Date();
  const exp = new Date(dateStr);
  if (exp <= now) return "text-red-600 font-semibold";
  const diff = exp.getTime() - now.getTime();
  if (diff <= 7 * 24 * 60 * 60 * 1000) return "text-orange-500 font-semibold";
  return "text-green-600";
}

function getStockColor(qty: number, reorderLevel: number | null): string {
  if (!reorderLevel) return "";
  if (qty < reorderLevel) return "text-red-600 font-semibold";
  if (qty === reorderLevel) return "text-orange-500 font-semibold";
  return "text-green-600";
}

function getExpiryBadge(dateStr: string | null) {
  if (!dateStr) return null;
  const now = new Date();
  const exp = new Date(dateStr);
  if (exp <= now) return <Badge variant="destructive" className="text-xs">Expired</Badge>;
  const diff = exp.getTime() - now.getTime();
  if (diff <= 7 * 24 * 60 * 60 * 1000) return <Badge className="bg-orange-500 text-white text-xs">Expiring Soon</Badge>;
  return null;
}

export default function DMSInventory({ skipLayout }: { skipLayout?: boolean }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: adminAuth } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editBatch, setEditBatch] = useState<InventoryBatch | null>(null);
  const [editForm, setEditForm] = useState({ quantity: 0, damagedQty: 0, stockNorm: 0, reorderLevel: 0 });
  const [addForm, setAddForm] = useState({
    productId: "",
    productName: "",
    batchNumber: "",
    manufacturingDate: "",
    expiryDate: "",
    quantity: 0,
    damagedQty: 0,
    unitType: "units",
    costPrice: "",
    sellingPrice: "",
    stockNorm: 0,
    reorderLevel: 0,
    minOrderQty: 1,
    warehouseLocation: "",
    segment: "Products",
    status: "active"
  });

  const merchantId = adminAuth?.user?.merchantId || adminAuth?.user?.id || user?.unionId || user?.id || "";
  const [productSearch, setProductSearch] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const { data: catalogProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/menu-items"],
  });

  const filteredProducts = catalogProducts.filter((p: any) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 20);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: batches = [], isLoading, refetch } = useQuery<InventoryBatch[]>({
    queryKey: ["/api/inventory-batches", merchantId, segmentFilter !== "all" ? `?segment=${segmentFilter}` : ""],
    enabled: !!merchantId,
  });

  const { data: alerts } = useQuery<AlertsData>({
    queryKey: ["/api/inventory-batches/alerts", merchantId],
    enabled: !!merchantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/inventory-batches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-batches"] });
      toast({ title: "Success", description: "Batch created successfully" });
      setAddOpen(false);
      resetAddForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create batch", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/inventory-batches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-batches"] });
      toast({ title: "Success", description: "Batch updated successfully" });
      setEditBatch(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update batch", variant: "destructive" });
    }
  });

  const resetAddForm = () => {
    setAddForm({
      productId: "", productName: "", batchNumber: "", manufacturingDate: "",
      expiryDate: "", quantity: 0, damagedQty: 0, unitType: "units",
      costPrice: "", sellingPrice: "", stockNorm: 0, reorderLevel: 0,
      minOrderQty: 1, warehouseLocation: "", segment: "Products", status: "active"
    });
  };

  const handleAddSubmit = () => {
    if (!addForm.productName || !addForm.batchNumber) {
      toast({ title: "Validation Error", description: "Product name and batch number are required", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      ...addForm,
      merchantId,
      productId: addForm.productId || addForm.productName.toLowerCase().replace(/\s+/g, "-"),
      manufacturingDate: addForm.manufacturingDate || null,
      expiryDate: addForm.expiryDate || null,
      costPrice: addForm.costPrice || null,
      sellingPrice: addForm.sellingPrice || null,
    });
  };

  const handleEditOpen = (batch: InventoryBatch) => {
    setEditBatch(batch);
    setEditForm({
      quantity: batch.quantity,
      damagedQty: batch.damagedQty,
      stockNorm: batch.stockNorm || 0,
      reorderLevel: batch.reorderLevel || 0,
    });
  };

  const handleEditSave = () => {
    if (!editBatch) return;
    updateMutation.mutate({ id: editBatch.id, data: editForm });
  };

  const filtered = batches.filter(b =>
    b.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBatches = batches.length;
  const totalStock = batches.reduce((s, b) => s + b.quantity, 0);
  const nearExpiry = (alerts?.expiryAlerts || []).length;
  const belowReorder = (alerts?.reorderAlerts || []).length;

  const Wrapper = skipLayout ? ({ children }: { children: React.ReactNode }) => <>{children}</> : AdminLayout;

  return (
    <Wrapper>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Warehouse className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">DMS Inventory</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Batch-wise Inventory Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Batch
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {(nearExpiry > 0 || belowReorder > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {belowReorder > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-6 w-6 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-800">Reorder Alerts</h3>
                      <p className="text-sm text-red-600 mb-2">{belowReorder} batch(es) below reorder level</p>
                      <div className="flex flex-wrap gap-1">
                        {(alerts?.reorderAlerts || []).slice(0, 5).map(a => (
                          <Badge key={a.id} variant="destructive" className="text-xs">
                            {a.productName} (Qty: {a.quantity})
                          </Badge>
                        ))}
                        {belowReorder > 5 && <Badge variant="secondary" className="text-xs">+{belowReorder - 5} more</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {nearExpiry > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="h-6 w-6 text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-orange-800">Expiry Alerts</h3>
                      <p className="text-sm text-orange-600 mb-2">{nearExpiry} batch(es) expiring within 7 days</p>
                      <div className="flex flex-wrap gap-1">
                        {(alerts?.expiryAlerts || []).slice(0, 5).map(a => (
                          <Badge key={a.id} className="bg-orange-500 text-white text-xs">
                            {a.productName} ({formatDate(a.expiryDate)})
                          </Badge>
                        ))}
                        {nearExpiry > 5 && <Badge variant="secondary" className="text-xs">+{nearExpiry - 5} more</Badge>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-[10px] sm:text-xs">Total Batches</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalBatches}</p>
                </div>
                <Layers className="h-6 w-6 sm:h-8 sm:w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-[10px] sm:text-xs">Total Stock</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalStock}</p>
                </div>
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-[10px] sm:text-xs">Near Expiry</p>
                  <p className="text-xl sm:text-2xl font-bold">{nearExpiry}</p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-2 sm:p-3 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-[10px] sm:text-xs">Below Reorder</p>
                  <p className="text-xl sm:text-2xl font-bold">{belowReorder}</p>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-lg">Inventory Batches</CardTitle>
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="relative col-span-2 sm:col-span-1 sm:w-64">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search product name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Segment" />
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
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground">Loading batches...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Batches Found</h3>
                <p className="text-muted-foreground mb-4">Add your first inventory batch to get started.</p>
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Batch
                </Button>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Batch No</TableHead>
                        <TableHead>Mfg Date</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Damaged</TableHead>
                        <TableHead className="text-right">Stock Norm</TableHead>
                        <TableHead className="text-right">Reorder Lvl</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{batch.productName}</p>
                              {batch.segment && <p className="text-xs text-muted-foreground">{batch.segment}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{batch.batchNumber}</TableCell>
                          <TableCell className="text-sm">{formatDate(batch.manufacturingDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className={`text-sm ${getExpiryColor(batch.expiryDate)}`}>
                                {formatDate(batch.expiryDate)}
                              </span>
                              {getExpiryBadge(batch.expiryDate)}
                            </div>
                          </TableCell>
                          <TableCell className={`text-right ${getStockColor(batch.quantity, batch.reorderLevel)}`}>
                            {batch.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            {batch.damagedQty > 0 ? (
                              <span className="text-red-600">{batch.damagedQty}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{batch.stockNorm ?? "-"}</TableCell>
                          <TableCell className="text-right">{batch.reorderLevel ?? "-"}</TableCell>
                          <TableCell className="text-sm">{batch.warehouseLocation || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={batch.status === "active" ? "default" : "secondary"}>
                              {batch.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button size="sm" variant="outline" onClick={() => handleEditOpen(batch)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden space-y-2 p-3">
                  {filtered.map((batch) => (
                    <Card key={batch.id} className="border shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{batch.productName}</p>
                            <p className="text-xs text-muted-foreground font-mono">Batch: {batch.batchNumber}</p>
                          </div>
                          <Badge variant={batch.status === "active" ? "default" : "secondary"} className="text-[10px] ml-2 shrink-0">
                            {batch.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Qty:</span>
                            <span className={`font-medium ${getStockColor(batch.quantity, batch.reorderLevel)}`}>{batch.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expiry:</span>
                            <span className={getExpiryColor(batch.expiryDate)}>{formatDate(batch.expiryDate)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {getExpiryBadge(batch.expiryDate)}
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleEditOpen(batch)}>
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="w-[95vw] sm:w-auto max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Inventory Batch</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div ref={productDropdownRef} className="relative">
              <Label htmlFor="add-productName">Product Name *</Label>
              <div className="relative">
                <Input
                  id="add-productName"
                  value={productDropdownOpen ? productSearch : addForm.productName}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setProductDropdownOpen(true);
                    if (!e.target.value) {
                      setAddForm(p => ({ ...p, productName: "", productId: "" }));
                    }
                  }}
                  onFocus={() => {
                    setProductSearch(addForm.productName);
                    setProductDropdownOpen(true);
                  }}
                  placeholder="Search products..."
                  autoComplete="off"
                />
                <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              {productDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredProducts.length > 0 ? filteredProducts.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-2"
                      onClick={() => {
                        setAddForm(prev => ({
                          ...prev,
                          productName: p.name,
                          productId: p.id,
                          segment: p.segment || prev.segment,
                          sellingPrice: p.price ? String(p.price) : prev.sellingPrice,
                        }));
                        setProductSearch("");
                        setProductDropdownOpen(false);
                      }}
                    >
                      <Package className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{p.name}</span>
                      {p.segment && <Badge variant="outline" className="ml-auto text-xs shrink-0">{p.segment}</Badge>}
                    </button>
                  )) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No products found</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="add-batchNumber">Batch Number *</Label>
              <Input id="add-batchNumber" value={addForm.batchNumber} onChange={(e) => setAddForm(p => ({ ...p, batchNumber: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="add-segment">Segment</Label>
              <Select value={addForm.segment} onValueChange={(v) => setAddForm(p => ({ ...p, segment: v }))}>
                <SelectTrigger id="add-segment"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fresh Milk">Fresh Milk</SelectItem>
                  <SelectItem value="Products">Products</SelectItem>
                  <SelectItem value="Ice Cream">Ice Cream</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-unitType">Unit Type</Label>
              <Select value={addForm.unitType} onValueChange={(v) => setAddForm(p => ({ ...p, unitType: v }))}>
                <SelectTrigger id="add-unitType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="units">Units</SelectItem>
                  <SelectItem value="liters">Liters</SelectItem>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="packets">Packets</SelectItem>
                  <SelectItem value="cases">Cases</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add-mfgDate">Manufacturing Date</Label>
              <Input id="add-mfgDate" type="date" value={addForm.manufacturingDate} onChange={(e) => setAddForm(p => ({ ...p, manufacturingDate: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="add-expDate">Expiry Date</Label>
              <Input id="add-expDate" type="date" value={addForm.expiryDate} onChange={(e) => setAddForm(p => ({ ...p, expiryDate: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="add-qty">Quantity</Label>
              <Input id="add-qty" type="number" min="0" value={addForm.quantity} onChange={(e) => setAddForm(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label htmlFor="add-damaged">Damaged Qty</Label>
              <Input id="add-damaged" type="number" min="0" value={addForm.damagedQty} onChange={(e) => setAddForm(p => ({ ...p, damagedQty: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label htmlFor="add-costPrice">Cost Price</Label>
              <Input id="add-costPrice" type="number" step="0.01" value={addForm.costPrice} onChange={(e) => setAddForm(p => ({ ...p, costPrice: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="add-sellingPrice">Selling Price</Label>
              <Input id="add-sellingPrice" type="number" step="0.01" value={addForm.sellingPrice} onChange={(e) => setAddForm(p => ({ ...p, sellingPrice: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="add-stockNorm">Stock Norm</Label>
              <Input id="add-stockNorm" type="number" min="0" value={addForm.stockNorm} onChange={(e) => setAddForm(p => ({ ...p, stockNorm: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label htmlFor="add-reorder">Reorder Level</Label>
              <Input id="add-reorder" type="number" min="0" value={addForm.reorderLevel} onChange={(e) => setAddForm(p => ({ ...p, reorderLevel: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label htmlFor="add-minOrder">Min Order Qty</Label>
              <Input id="add-minOrder" type="number" min="1" value={addForm.minOrderQty} onChange={(e) => setAddForm(p => ({ ...p, minOrderQty: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <Label htmlFor="add-warehouse">Warehouse Location</Label>
              <Input id="add-warehouse" value={addForm.warehouseLocation} onChange={(e) => setAddForm(p => ({ ...p, warehouseLocation: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="add-status">Status</Label>
              <Select value={addForm.status} onValueChange={(v) => setAddForm(p => ({ ...p, status: v }))}>
                <SelectTrigger id="add-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="quarantine">Quarantine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} disabled={createMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {createMutation.isPending ? "Saving..." : "Add Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editBatch} onOpenChange={(open) => !open && setEditBatch(null)}>
        <DialogContent className="w-[95vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
          </DialogHeader>
          {editBatch && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Product</Label>
                <p className="font-medium">{editBatch.productName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Batch Number</Label>
                <p className="font-medium font-mono">{editBatch.batchNumber}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-qty">Quantity</Label>
                  <Input id="edit-qty" type="number" min="0" value={editForm.quantity} onChange={(e) => setEditForm(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label htmlFor="edit-damaged">Damaged Qty</Label>
                  <Input id="edit-damaged" type="number" min="0" value={editForm.damagedQty} onChange={(e) => setEditForm(p => ({ ...p, damagedQty: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label htmlFor="edit-stockNorm">Stock Norm</Label>
                  <Input id="edit-stockNorm" type="number" min="0" value={editForm.stockNorm} onChange={(e) => setEditForm(p => ({ ...p, stockNorm: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label htmlFor="edit-reorder">Reorder Level</Label>
                  <Input id="edit-reorder" type="number" min="0" value={editForm.reorderLevel} onChange={(e) => setEditForm(p => ({ ...p, reorderLevel: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBatch(null)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </Wrapper>
  );
}
