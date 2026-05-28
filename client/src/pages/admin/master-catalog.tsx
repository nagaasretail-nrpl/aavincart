import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Upload,
  Search,
  Edit,
  Trash2,
  Settings,
  Package,
  Filter,
  X,
  ImagePlus,
  Download,
} from "lucide-react";
import { parseXlsxToRows, downloadSampleExcel, SAMPLE_EXCEL_CONFIGS } from '@/lib/excel-utils';

interface MasterProduct {
  id: string;
  productCode: string;
  name: string;
  barcode?: string;
  description?: string;
  segment: string;
  category?: string;
  subcategory?: string;
  hsnCode?: string;
  gstPercent?: string;
  unitSize?: string;
  unitType?: string;
  packagingType?: string;
  unitsPerPackage?: number;
  packageWeight?: string;
  packageWeightUnit?: string;
  federationPrice?: string;
  interUnionPrice?: string;
  wholesalePrice?: string;
  dealerPrice?: string;
  retailerPrice?: string;
  mrp: string;
  image?: string;
  isActive: boolean;
  enabledUnions?: number;
}

const emptyForm: Record<string, any> = {
  productCode: "",
  name: "",
  barcode: "",
  description: "",
  segment: "",
  category: "",
  subcategory: "",
  hsnCode: "",
  gstPercent: "",
  unitSize: "",
  unitType: "",
  packagingType: "",
  unitsPerPackage: "",
  packageWeight: "",
  packageWeightUnit: "",
  federationPrice: "",
  interUnionPrice: "",
  wholesalePrice: "",
  dealerPrice: "",
  retailerPrice: "",
  mrp: "",
  image: "",
  isActive: true,
};

export default function MasterCatalog() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [segment, setSegment] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MasterProduct | null>(null);
  const [form, setForm] = useState<Record<string, any>>({ ...emptyForm });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<MasterProduct | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<Record<number, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [unionsProduct, setUnionsProduct] = useState<MasterProduct | null>(null);
  const [bulkImageDialogOpen, setBulkImageDialogOpen] = useState(false);
  const [bulkImageFiles, setBulkImageFiles] = useState<File[]>([]);
  const [bulkImageMatches, setBulkImageMatches] = useState<{fileName: string; productCode: string; productName: string; matched: boolean}[]>([]);
  const [bulkImageUploading, setBulkImageUploading] = useState(false);
  const [bulkImageResults, setBulkImageResults] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const bulkImageRef = useRef<HTMLInputElement>(null);

  const queryParams = new URLSearchParams();
  if (segment !== "all") queryParams.set("segment", segment);
  if (status !== "all") queryParams.set("status", status);
  if (search) queryParams.set("search", search);
  const queryString = queryParams.toString();

  const { data: products = [], isLoading } = useQuery<MasterProduct[]>({
    queryKey: ["/api/admin/master-products", queryString],
    queryFn: async () => {
      const url = "/api/admin/master-products" + (queryString ? `?${queryString}` : "");
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === 'string' && key.startsWith('/api/admin/master-products');
    }});
  };

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/admin/master-products", data);
      return res.json();
    },
    onSuccess: () => {
      invalidateProducts();
      toast({ title: "Success", description: "Product created successfully" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await apiRequest("PUT", `/api/admin/master-products/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      invalidateProducts();
      toast({ title: "Success", description: "Product updated successfully" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/master-products/${id}`);
    },
    onSuccess: () => {
      invalidateProducts();
      toast({ title: "Success", description: "Product deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (products: any[]) => {
      const res = await apiRequest("POST", "/api/admin/master-products/bulk-import", { products });
      return res.json();
    },
    onSuccess: (data: any) => {
      invalidateProducts();
      toast({
        title: "Import Complete",
        description: `Created: ${data.created || 0}, Updated: ${data.updated || 0}, Errors: ${data.errors?.length || 0}, Total: ${data.total}`,
      });
      setBulkDialogOpen(false);
      setBulkData([]);
      setBulkErrors({});
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", "/api/admin/master-products/bulk-delete", { ids });
      return res.json();
    },
    onSuccess: (data: any) => {
      invalidateProducts();
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);
      toast({ title: "Deleted", description: `${data.deleted} product(s) deleted successfully` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function toggleSelectAll() {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingProduct(null);
    setForm({ ...emptyForm });
    setImagePreview(null);
  }

  function openAddDialog() {
    setEditingProduct(null);
    setForm({ ...emptyForm });
    setImagePreview(null);
    setDialogOpen(true);
  }

  function openEditDialog(product: MasterProduct) {
    setEditingProduct(product);
    setForm({
      productCode: product.productCode || "",
      name: product.name || "",
      barcode: product.barcode || "",
      description: product.description || "",
      segment: product.segment || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      hsnCode: product.hsnCode || "",
      gstPercent: product.gstPercent || "",
      unitSize: product.unitSize || "",
      unitType: product.unitType || "",
      packagingType: product.packagingType || "",
      unitsPerPackage: product.unitsPerPackage?.toString() || "",
      packageWeight: product.packageWeight || "",
      packageWeightUnit: product.packageWeightUnit || "",
      federationPrice: product.federationPrice || "",
      interUnionPrice: product.interUnionPrice || "",
      wholesalePrice: product.wholesalePrice || "",
      dealerPrice: product.dealerPrice || "",
      retailerPrice: product.retailerPrice || "",
      mrp: product.mrp || "",
      image: product.image || "",
      isActive: product.isActive !== false,
    });
    setImagePreview(product.image || null);
    setDialogOpen(true);
  }

  function handleFormChange(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    if (!form.productCode?.trim()) {
      toast({ title: "Validation Error", description: "Product Code is required", variant: "destructive" });
      return;
    }
    if (!form.name?.trim()) {
      toast({ title: "Validation Error", description: "Product Name is required", variant: "destructive" });
      return;
    }
    if (!form.segment) {
      toast({ title: "Validation Error", description: "Segment is required", variant: "destructive" });
      return;
    }
    if (!form.mrp) {
      toast({ title: "Validation Error", description: "MRP is required", variant: "destructive" });
      return;
    }

    const payload = {
      ...form,
      unitsPerPackage: form.unitsPerPackage ? parseInt(form.unitsPerPackage) : undefined,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch("/api/admin/master-products/upload-image", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      handleFormChange("image", data.url);
      setImagePreview(data.url);
      toast({ title: "Success", description: "Image uploaded" });
    } catch {
      toast({ title: "Error", description: "Image upload failed", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  }

  const HEADER_MAP: Record<string, string> = {
    'product code': 'productCode', 'product code *': 'productCode', 'productcode': 'productCode', 'product_code': 'productCode', 'code': 'productCode',
    'product name': 'name', 'product name *': 'name', 'productname': 'name', 'name': 'name',
    'segment': 'segment', 'segment *': 'segment', 'product segment': 'segment',
    'category': 'category', 'product category': 'category',
    'subcategory': 'subcategory', 'sub category': 'subcategory', 'sub_category': 'subcategory',
    'hsn code': 'hsnCode', 'hsn': 'hsnCode', 'hsncode': 'hsnCode', 'hsn_code': 'hsnCode',
    'gst %': 'gstPercent', 'gst%': 'gstPercent', 'gst': 'gstPercent', 'gstpercent': 'gstPercent', 'gst_percent': 'gstPercent', 'gst percent': 'gstPercent',
    'unit size': 'unitSize', 'unitsize': 'unitSize', 'unit_size': 'unitSize', 'size': 'unitSize',
    'unit type': 'unitType', 'unittype': 'unitType', 'unit_type': 'unitType', 'unit': 'unitType',
    'barcode': 'barcode', 'bar code': 'barcode',
    'packaging type': 'packagingType', 'packagingtype': 'packagingType', 'packaging_type': 'packagingType', 'pack type': 'packagingType', 'case type': 'packagingType', 'casetype': 'packagingType', 'case_type': 'packagingType',
    'units per package': 'unitsPerPackage', 'unitsperpackage': 'unitsPerPackage', 'units_per_package': 'unitsPerPackage', 'qty per package': 'unitsPerPackage', 'units per case': 'unitsPerPackage', 'unitspercase': 'unitsPerPackage', 'units_per_case': 'unitsPerPackage', 'qty per case': 'unitsPerPackage',
    'package weight': 'packageWeight', 'packageweight': 'packageWeight', 'package_weight': 'packageWeight', 'pack weight': 'packageWeight',
    'package weight unit': 'packageWeightUnit', 'packageweightunit': 'packageWeightUnit', 'package_weight_unit': 'packageWeightUnit', 'pack wt unit': 'packageWeightUnit',
    'federation price': 'federationPrice', 'federationprice': 'federationPrice', 'federation_price': 'federationPrice', 'fed price': 'federationPrice', 'fed. price': 'federationPrice',
    'inter-union price': 'interUnionPrice', 'inter union price': 'interUnionPrice', 'interunionprice': 'interUnionPrice', 'inter_union_price': 'interUnionPrice', 'iu price': 'interUnionPrice',
    'wholesale/wsd price': 'wholesalePrice', 'wholesale price': 'wholesalePrice', 'wholesaleprice': 'wholesalePrice', 'wholesale_price': 'wholesalePrice', 'wsd price': 'wholesalePrice',
    'dealer price': 'dealerPrice', 'dealerprice': 'dealerPrice', 'dealer_price': 'dealerPrice', 'dlr price': 'dealerPrice',
    'retailer price': 'retailerPrice', 'retailerprice': 'retailerPrice', 'retailer_price': 'retailerPrice', 'rtl price': 'retailerPrice',
    'mrp': 'mrp', 'mrp *': 'mrp', 'consumer price': 'mrp', 'retail price': 'mrp',
    'description': 'description', 'product description': 'description',
  };

  function parseRowsFromData(rawRows: Record<string, any>[]) {
    const rows: any[] = [];
    const errors: Record<number, string> = {};

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i];
      const row: Record<string, string> = {};

      Object.entries(raw).forEach(([key, value]) => {
        const normalizedKey = key.trim().toLowerCase().replace(/[*]/g, '').trim();
        const mappedKey = HEADER_MAP[normalizedKey];
        if (mappedKey) {
          row[mappedKey] = String(value ?? '').trim();
        }
      });

      const segmentMap: Record<string, string> = {
        'fresh milk': 'Fresh Milk', 'freshmilk': 'Fresh Milk', 'fm': 'Fresh Milk', 'milk': 'Fresh Milk',
        'products': 'Products', 'product': 'Products', 'dairy': 'Products',
        'ice cream': 'Ice Cream', 'icecream': 'Ice Cream', 'ic': 'Ice Cream',
      };
      if (row.segment) {
        const normalizedSegment = segmentMap[row.segment.toLowerCase().trim()];
        if (normalizedSegment) row.segment = normalizedSegment;
      }

      const rowErrors: string[] = [];
      if (!row.productCode) rowErrors.push("Missing product code");
      if (!row.name) rowErrors.push("Missing name");
      if (!row.segment || !['Fresh Milk', 'Products', 'Ice Cream'].includes(row.segment)) {
        if (row.segment) rowErrors.push(`Invalid segment "${row.segment}" (must be Fresh Milk, Products, or Ice Cream)`);
        else rowErrors.push("Missing segment");
      }

      if (rowErrors.length > 0) {
        errors[i + 1] = rowErrors.join("; ");
      }

      rows.push({
        productCode: row.productCode || "",
        name: row.name || "",
        segment: row.segment || "Products",
        category: row.category || "",
        subcategory: row.subcategory || "",
        hsnCode: row.hsnCode || "",
        gstPercent: row.gstPercent || "",
        unitSize: row.unitSize || "",
        unitType: row.unitType || "",
        mrp: row.mrp || "",
        federationPrice: row.federationPrice || "",
        interUnionPrice: row.interUnionPrice || "",
        wholesalePrice: row.wholesalePrice || "",
        dealerPrice: row.dealerPrice || "",
        retailerPrice: row.retailerPrice || "",
        barcode: row.barcode || "",
        description: row.description || "",
        packagingType: row.packagingType || "",
        unitsPerPackage: row.unitsPerPackage || "",
        packageWeight: row.packageWeight || "",
        packageWeightUnit: row.packageWeightUnit || "",
        isActive: true,
      });
    }

    return { rows, errors };
  }

  function handleBulkFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      (async () => {
        try {
          const buffer = await file.arrayBuffer();
          const { rows: rawRows } = await parseXlsxToRows(buffer);
          if (rawRows.length === 0) {
            toast({ title: "Error", description: "No data rows found in the file", variant: "destructive" });
            return;
          }
          const { rows, errors } = parseRowsFromData(rawRows);
          setBulkData(rows);
          setBulkErrors(errors);
        } catch {
          toast({ title: "Error", description: "Failed to parse Excel file", variant: "destructive" });
        }
      })();
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target?.result as string;
          const lines = text.split("\n").filter((l) => l.trim());
          if (lines.length < 2) {
            toast({ title: "Error", description: "File must have a header row and at least one data row", variant: "destructive" });
            return;
          }

          const headers = lines[0].split(",").map((h) => h.trim());
          const rawRows: Record<string, any>[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v) => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
              row[h] = values[idx] || "";
            });
            rawRows.push(row);
          }

          const { rows, errors } = parseRowsFromData(rawRows);
          setBulkData(rows);
          setBulkErrors(errors);
        } catch {
          toast({ title: "Error", description: "Failed to parse CSV file", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    }

    if (e.target) e.target.value = '';
  }

  async function handleBulkImageSelect(files: File[]) {
    setBulkImageFiles(files);
    let allProducts: MasterProduct[] = products || [];
    try {
      const res = await fetch('/api/admin/master-products', { credentials: 'include' });
      if (res.ok) allProducts = await res.json();
    } catch {}
    const productByCode: Record<string, MasterProduct> = {};
    allProducts.forEach(p => { productByCode[p.productCode.toLowerCase()] = p; });

    const matches = files.map(file => {
      const ext = file.name.lastIndexOf('.');
      const baseName = ext > 0 ? file.name.substring(0, ext).trim() : file.name.trim();
      const matched = productByCode[baseName.toLowerCase()];
      return {
        fileName: file.name,
        productCode: baseName,
        productName: matched?.name || '',
        matched: !!matched,
      };
    });
    setBulkImageMatches(matches);
  }

  async function handleBulkImageUpload() {
    const matchedFiles = bulkImageFiles.filter((_, i) => bulkImageMatches[i]?.matched);
    if (matchedFiles.length === 0) return;

    setBulkImageUploading(true);
    try {
      const formData = new FormData();
      bulkImageFiles.forEach((file, i) => {
        if (bulkImageMatches[i]?.matched) {
          formData.append('images', file);
        }
      });

      const res = await fetch('/api/admin/master-products/bulk-upload-images', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setBulkImageResults(data);
      toast({ title: "Upload Complete", description: `${data.summary.matched} of ${data.summary.total} images uploaded successfully` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to upload images", variant: "destructive" });
    } finally {
      setBulkImageUploading(false);
    }
  }

  async function handleExportProducts() {
    try {
      const res = await fetch('/api/admin/master-products/export', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to export products');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Master_Products_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export Complete', description: 'Master products downloaded successfully' });
    } catch (err: any) {
      toast({ title: 'Export Failed', description: err.message, variant: 'destructive' });
    }
  }

  async function handleExportPricingTiers() {
    try {
      const res = await fetch('/api/admin/pricing-tiers/export', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to export pricing tiers');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pricing_Tiers_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export Complete', description: 'Pricing tiers downloaded successfully' });
    } catch (err: any) {
      toast({ title: 'Export Failed', description: err.message, variant: 'destructive' });
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="h-6 w-6" />
              Master Catalog
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Global product catalog for all unions
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={handleExportProducts}>
              <Download className="h-4 w-4 mr-2" />
              Export Products
            </Button>
            <Button variant="outline" onClick={handleExportPricingTiers}>
              <Download className="h-4 w-4 mr-2" />
              Export Pricing Tiers
            </Button>
            <Button variant="outline" onClick={() => { setBulkImageDialogOpen(true); setBulkImageFiles([]); setBulkImageMatches([]); setBulkImageResults(null); }}>
              <ImagePlus className="h-4 w-4 mr-2" />
              Bulk Images
            </Button>
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <Tabs value={segment} onValueChange={(v) => { setSegment(v); setSelectedIds(new Set()); }} className="w-full lg:w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="Fresh Milk">Fresh Milk</TabsTrigger>
                  <TabsTrigger value="Products">Products</TabsTrigger>
                  <TabsTrigger value="Ice Cream">Ice Cream</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, code, barcode..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setSelectedIds(new Set()); }}
                    className="pl-9"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={status} onValueChange={(v) => { setStatus(v); setSelectedIds(new Set()); }}>
                  <SelectTrigger className="w-32">
                    <Filter className="h-4 w-4 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="whitespace-nowrap">
                  {products.length} products
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {selectedIds.size} product{selectedIds.size > 1 ? "s" : ""} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
              </div>
            )}
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No products found</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Try adjusting your filters or add a new product
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 px-3">
                        <Checkbox
                          checked={products.length > 0 && selectedIds.size === products.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-28">Product Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>HSN</TableHead>
                      <TableHead className="text-right">GST%</TableHead>
                      <TableHead className="text-right">MRP</TableHead>
                      <TableHead className="text-right">Fed. Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Unions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id} className={selectedIds.has(product.id) ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}>
                        <TableCell className="px-3">
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => toggleSelect(product.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.productCode}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{product.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              product.segment === "Fresh Milk"
                                ? "border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:bg-blue-900/20"
                                : product.segment === "Ice Cream"
                                ? "border-violet-200 text-violet-700 bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:bg-violet-900/20"
                                : "border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/20"
                            }
                          >
                            {product.segment}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">{product.category || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {product.unitSize && product.unitType
                            ? `${product.unitSize} ${product.unitType}`
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-600 dark:text-gray-400">{product.hsnCode || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{product.gstPercent ? `${product.gstPercent}%` : "—"}</TableCell>
                        <TableCell className="text-right font-semibold">₹{product.mrp}</TableCell>
                        <TableCell className="text-right text-sm text-gray-600 dark:text-gray-400">
                          {product.federationPrice ? `₹${product.federationPrice}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isActive !== false ? "default" : "secondary"}>
                            {product.isActive !== false ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{product.enabledUnions ?? 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingProduct(product);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUnionsProduct(product)}
                              title="Manage Unions"
                            >
                              <Settings className="h-4 w-4" />
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

        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update the product details below"
                  : "Fill in the details to add a new product to the master catalog"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-1">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Product Code *</Label>
                    <Input
                      value={form.productCode}
                      onChange={(e) => handleFormChange("productCode", e.target.value)}
                      placeholder="e.g., FM-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => handleFormChange("name", e.target.value)}
                      placeholder="e.g., Full Cream Milk 500ml"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Barcode</Label>
                    <Input
                      value={form.barcode}
                      onChange={(e) => handleFormChange("barcode", e.target.value)}
                      placeholder="e.g., 8901234567890"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => handleFormChange("description", e.target.value)}
                      placeholder="Product description..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-1">
                  Classification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Segment *</Label>
                    <Select value={form.segment} onValueChange={(v) => handleFormChange("segment", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fresh Milk">Fresh Milk</SelectItem>
                        <SelectItem value="Products">Products</SelectItem>
                        <SelectItem value="Ice Cream">Ice Cream</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      value={form.category}
                      onChange={(e) => handleFormChange("category", e.target.value)}
                      placeholder="e.g., Curd, Butter"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subcategory</Label>
                    <Input
                      value={form.subcategory}
                      onChange={(e) => handleFormChange("subcategory", e.target.value)}
                      placeholder="e.g., Set Curd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>HSN Code</Label>
                    <Input
                      value={form.hsnCode}
                      onChange={(e) => handleFormChange("hsnCode", e.target.value)}
                      placeholder="e.g., 0401"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GST %</Label>
                    <Input
                      type="number"
                      value={form.gstPercent}
                      onChange={(e) => handleFormChange("gstPercent", e.target.value)}
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-1">
                  Units
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Size</Label>
                    <Input
                      value={form.unitSize}
                      onChange={(e) => handleFormChange("unitSize", e.target.value)}
                      placeholder="e.g., 500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Type</Label>
                    <Select value={form.unitType} onValueChange={(v) => handleFormChange("unitType", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="nos">nos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-1">
                  Case Packaging
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Case Type</Label>
                    <Select value={form.packagingType} onValueChange={(v) => handleFormChange("packagingType", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select case type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="box">Box</SelectItem>
                        <SelectItem value="tray">Tray</SelectItem>
                        <SelectItem value="tub">Tub</SelectItem>
                        <SelectItem value="bag">Bag</SelectItem>
                        <SelectItem value="tin">Tin</SelectItem>
                        <SelectItem value="jar">Jar</SelectItem>
                        <SelectItem value="carton">Carton</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Units Per Case</Label>
                    <Input
                      type="number"
                      value={form.unitsPerPackage}
                      onChange={(e) => handleFormChange("unitsPerPackage", e.target.value)}
                      placeholder="e.g., 12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Package Weight</Label>
                    <Input
                      type="number"
                      value={form.packageWeight}
                      onChange={(e) => handleFormChange("packageWeight", e.target.value)}
                      placeholder="e.g., 6"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Package Weight Unit</Label>
                    <Select value={form.packageWeightUnit} onValueChange={(v) => handleFormChange("packageWeightUnit", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kgs">kgs</SelectItem>
                        <SelectItem value="lit">lit</SelectItem>
                        <SelectItem value="nos">nos</SelectItem>
                        <SelectItem value="pkts">pkts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-1">
                  Pricing Tiers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Federation Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.federationPrice}
                      onChange={(e) => handleFormChange("federationPrice", e.target.value)}
                      placeholder="₹"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Inter-Union Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.interUnionPrice}
                      onChange={(e) => handleFormChange("interUnionPrice", e.target.value)}
                      placeholder="₹"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wholesale/WSD Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.wholesalePrice}
                      onChange={(e) => handleFormChange("wholesalePrice", e.target.value)}
                      placeholder="₹"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dealer Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.dealerPrice}
                      onChange={(e) => handleFormChange("dealerPrice", e.target.value)}
                      placeholder="₹"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Retailer Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.retailerPrice}
                      onChange={(e) => handleFormChange("retailerPrice", e.target.value)}
                      placeholder="₹"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>MRP *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.mrp}
                      onChange={(e) => handleFormChange("mrp", e.target.value)}
                      placeholder="₹"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-1">
                  Product Image
                </h3>
                <div className="flex items-start gap-4">
                  {imagePreview ? (
                    <div className="relative w-24 h-24 rounded-lg border overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          handleFormChange("image", "");
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                    >
                      <ImagePlus className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-400 mt-1">Upload</span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>Upload a product image (JPG, PNG)</p>
                    <p className="text-xs mt-1">Recommended: 400x400px</p>
                    {uploadingImage && <p className="text-blue-500 mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b pb-1">
                  Status
                </h3>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => handleFormChange("isActive", v)}
                  />
                  <Label>{form.isActive ? "Active" : "Inactive"}</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isMutating}>
                {isMutating
                  ? "Saving..."
                  : editingProduct
                  ? "Update Product"
                  : "Create Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{deletingProduct?.name}</span>? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeletingProduct(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {selectedIds.size} Product{selectedIds.size > 1 ? "s" : ""}</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedIds.size} selected product{selectedIds.size > 1 ? "s" : ""}? This will also remove them from all unions. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${selectedIds.size} Product${selectedIds.size > 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={bulkDialogOpen} onOpenChange={(open) => { if (!open) { setBulkDialogOpen(false); setBulkData([]); setBulkErrors({}); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bulk Import Products</DialogTitle>
              <DialogDescription>
                Upload an Excel or CSV file with product data. Required columns: Product Code, Name, Segment, MRP
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {bulkData.length === 0 ? (
                <div className="space-y-3">
                  <div
                    onClick={() => bulkFileRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  >
                    <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Click to upload file
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Supports .xlsx, .xls, and .csv files
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSampleExcel(SAMPLE_EXCEL_CONFIGS.masterProducts)}
                      className="text-xs"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download Sample Template
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">
                      {bulkData.length} rows parsed
                      {Object.keys(bulkErrors).length > 0 && (
                        <span className="text-red-500 ml-2">
                          ({Object.keys(bulkErrors).length} with errors)
                        </span>
                      )}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBulkData([]);
                        setBulkErrors({});
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="overflow-x-auto border rounded-lg max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Segment</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>HSN</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>MRP</TableHead>
                          <TableHead>Fed. Price</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkData.map((row, idx) => {
                          const segColors: Record<string, string> = {
                            'Fresh Milk': 'bg-cyan-100 text-cyan-700',
                            'Products': 'bg-emerald-100 text-emerald-700',
                            'Ice Cream': 'bg-pink-100 text-pink-700',
                          };
                          return (
                            <TableRow
                              key={idx}
                              className={bulkErrors[idx + 1] ? "bg-red-50 dark:bg-red-900/10" : ""}
                            >
                              <TableCell className="text-xs text-gray-500">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-xs">{row.productCode}</TableCell>
                              <TableCell className="text-sm">{row.name}</TableCell>
                              <TableCell>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${segColors[row.segment] || 'bg-gray-100 text-gray-700'}`}>
                                  {row.segment}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">{row.category || "—"}</TableCell>
                              <TableCell className="text-xs text-gray-600">{row.hsnCode || "—"}</TableCell>
                              <TableCell className="text-xs text-gray-600">{row.unitSize && row.unitType ? `${row.unitSize} ${row.unitType}` : row.unitSize || "—"}</TableCell>
                              <TableCell className="text-xs font-medium">{row.mrp ? `₹${row.mrp}` : "—"}</TableCell>
                              <TableCell className="text-xs">{row.federationPrice ? `₹${row.federationPrice}` : "—"}</TableCell>
                              <TableCell>
                                {bulkErrors[idx + 1] ? (
                                  <span className="text-xs text-red-600">{bulkErrors[idx + 1]}</span>
                                ) : (
                                  <Badge variant="outline" className="text-green-600 border-green-200">
                                    Valid
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              <input
                ref={bulkFileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleBulkFileSelect}
                className="hidden"
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setBulkDialogOpen(false);
                  setBulkData([]);
                  setBulkErrors({});
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => bulkImportMutation.mutate(bulkData)}
                disabled={bulkData.length === 0 || bulkImportMutation.isPending}
              >
                {bulkImportMutation.isPending
                  ? "Importing..."
                  : `Import ${bulkData.length} Products`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={bulkImageDialogOpen} onOpenChange={(open) => { if (!open) { setBulkImageDialogOpen(false); setBulkImageFiles([]); setBulkImageMatches([]); setBulkImageResults(null); } }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5" />
                Bulk Upload Product Images
              </DialogTitle>
              <DialogDescription>
                Select multiple images. Filenames must match product codes (e.g., <code className="bg-gray-100 px-1 rounded text-xs">SLM-FM-001.jpg</code> matches product code <code className="bg-gray-100 px-1 rounded text-xs">SLM-FM-001</code>).
              </DialogDescription>
            </DialogHeader>

            {!bulkImageResults ? (
              <div className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => bulkImageRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f.name));
                    if (droppedFiles.length > 0) handleBulkImageSelect(droppedFiles);
                  }}
                >
                  <ImagePlus className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700">Click to select images or drag & drop</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WebP — up to 100 images</p>
                </div>
                <input
                  ref={bulkImageRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) handleBulkImageSelect(files);
                    if (e.target) e.target.value = '';
                  }}
                  className="hidden"
                />

                {bulkImageMatches.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-100 text-green-800">{bulkImageMatches.filter(m => m.matched).length} Matched</Badge>
                      <Badge className="bg-red-100 text-red-800">{bulkImageMatches.filter(m => !m.matched).length} Unmatched</Badge>
                      <span className="text-xs text-gray-500">{bulkImageFiles.length} images selected</span>
                    </div>
                    <div className="border rounded-lg overflow-hidden max-h-[340px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Filename</TableHead>
                            <TableHead>Product Code</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="w-20">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bulkImageMatches.map((m, i) => (
                            <TableRow key={i} className={m.matched ? '' : 'bg-red-50'}>
                              <TableCell className="text-xs text-gray-400">{i + 1}</TableCell>
                              <TableCell className="text-xs font-mono">{m.fileName}</TableCell>
                              <TableCell className="text-xs font-mono font-bold">{m.productCode}</TableCell>
                              <TableCell className="text-xs">{m.productName || '—'}</TableCell>
                              <TableCell>
                                {m.matched
                                  ? <Badge className="bg-green-100 text-green-700 text-[10px]">Match</Badge>
                                  : <Badge className="bg-red-100 text-red-700 text-[10px]">No match</Badge>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="bg-blue-50 p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{bulkImageResults.summary.total}</p>
                    <p className="text-xs text-blue-600">Total</p>
                  </Card>
                  <Card className="bg-green-50 p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{bulkImageResults.summary.matched}</p>
                    <p className="text-xs text-green-600">Uploaded</p>
                  </Card>
                  <Card className="bg-orange-50 p-3 text-center">
                    <p className="text-2xl font-bold text-orange-700">{bulkImageResults.summary.unmatched}</p>
                    <p className="text-xs text-orange-600">Unmatched</p>
                  </Card>
                  <Card className="bg-red-50 p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{bulkImageResults.summary.errors}</p>
                    <p className="text-xs text-red-600">Errors</p>
                  </Card>
                </div>
                <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filename</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkImageResults.results.map((r: any, i: number) => (
                        <TableRow key={i} className={r.status === 'success' ? '' : r.status === 'unmatched' ? 'bg-orange-50' : 'bg-red-50'}>
                          <TableCell className="text-xs font-mono">{r.fileName}</TableCell>
                          <TableCell className="text-xs">{r.productName || r.productCode}</TableCell>
                          <TableCell>
                            <Badge className={r.status === 'success' ? 'bg-green-100 text-green-700' : r.status === 'unmatched' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'} >
                              {r.status === 'success' ? 'Uploaded' : r.status === 'unmatched' ? 'No match' : 'Error'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter>
              {!bulkImageResults ? (
                <>
                  <Button variant="outline" onClick={() => { setBulkImageDialogOpen(false); setBulkImageFiles([]); setBulkImageMatches([]); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkImageUpload}
                    disabled={bulkImageMatches.filter(m => m.matched).length === 0 || bulkImageUploading}
                  >
                    {bulkImageUploading
                      ? "Uploading..."
                      : `Upload ${bulkImageMatches.filter(m => m.matched).length} Images`}
                  </Button>
                </>
              ) : (
                <Button onClick={() => { setBulkImageDialogOpen(false); setBulkImageFiles([]); setBulkImageMatches([]); setBulkImageResults(null); queryClient.invalidateQueries({ queryKey: ["/api/admin/master-products"] }); }}>
                  Done
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {unionsProduct && (
          <ManageUnionsDialog
            product={unionsProduct}
            onClose={() => setUnionsProduct(null)}
            onUpdate={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/master-products"] })}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function ManageUnionsDialog({ product, onClose, onUpdate }: { product: MasterProduct; onClose: () => void; onUpdate: () => void }) {
  const { toast } = useToast();

  const { data: merchants = [] } = useQuery<any[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: mappings = [], refetch: refetchMappings } = useQuery<any[]>({
    queryKey: ["/api/admin/master-products", product.id, "unions"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/master-products/${product.id}/unions`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const enabledMerchantIds = new Set(mappings.map((m: any) => m.merchantId));

  const toggleUnion = async (merchantId: string, enable: boolean) => {
    try {
      if (enable) {
        await apiRequest("POST", `/api/admin/master-products/${product.id}/unions`, { merchantIds: [merchantId] });
      } else {
        await fetch(`/api/admin/master-products/${product.id}/unions`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantIds: [merchantId] }),
        });
      }
      refetchMappings();
      onUpdate();
    } catch {
      toast({ title: "Error", description: "Failed to update union", variant: "destructive" });
    }
  };

  const enableAll = async () => {
    const disabledIds = merchants.filter((m: any) => !enabledMerchantIds.has(m.id)).map((m: any) => m.id);
    if (disabledIds.length === 0) return;
    try {
      await apiRequest("POST", `/api/admin/master-products/${product.id}/unions`, { merchantIds: disabledIds });
      refetchMappings();
      onUpdate();
      toast({ title: "Done", description: `Enabled for ${disabledIds.length} unions` });
    } catch {
      toast({ title: "Error", description: "Failed to enable unions", variant: "destructive" });
    }
  };

  const disableAll = async () => {
    const enabledIds = merchants.filter((m: any) => enabledMerchantIds.has(m.id)).map((m: any) => m.id);
    if (enabledIds.length === 0) return;
    try {
      await fetch(`/api/admin/master-products/${product.id}/unions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantIds: enabledIds }),
      });
      refetchMappings();
      onUpdate();
      toast({ title: "Done", description: `Disabled for ${enabledIds.length} unions` });
    } catch {
      toast({ title: "Error", description: "Failed to disable unions", variant: "destructive" });
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Unions
          </DialogTitle>
          <DialogDescription>
            Select which District Unions can sell <strong>{product.name}</strong> ({product.productCode})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{enabledMerchantIds.size} of {merchants.length} unions enabled</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={enableAll} className="text-xs h-7">Enable All</Button>
              <Button variant="outline" size="sm" onClick={disableAll} className="text-xs h-7">Disable All</Button>
            </div>
          </div>
          <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
            {merchants.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No unions found</div>
            ) : (
              merchants.map((merchant: any) => {
                const isEnabled = enabledMerchantIds.has(merchant.id);
                return (
                  <div key={merchant.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span className="text-sm font-medium">{merchant.name}</span>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => toggleUnion(merchant.id, checked)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
