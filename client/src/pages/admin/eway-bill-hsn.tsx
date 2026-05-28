import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "./layout";
import { Plus, Search, RefreshCw, Edit, Database } from "lucide-react";

interface HsnCode {
  id: string;
  hsnCode: string;
  description: string;
  gstRate: string;
  cessRate: string;
  category: string;
  unit: string;
  isActive: boolean;
}

export default function EwayBillHsnPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHsn, setEditingHsn] = useState<HsnCode | null>(null);
  
  const [formData, setFormData] = useState({
    hsnCode: "",
    description: "",
    gstRate: "5",
    cessRate: "0",
    category: "milk",
    unit: "LTR"
  });

  const { data: hsnCodes = [], isLoading, refetch } = useQuery<HsnCode[]>({
    queryKey: ['/api/admin/hsn-codes', categoryFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      const res = await fetch(`/api/admin/hsn-codes?${params}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest('POST', '/api/admin/hsn-codes', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "HSN Code added successfully" });
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/hsn-codes'] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add HSN Code", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      hsnCode: "",
      description: "",
      gstRate: "5",
      cessRate: "0",
      category: "milk",
      unit: "LTR"
    });
    setEditingHsn(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.hsnCode || !formData.description) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const categories = [
    { value: "milk", label: "Milk" },
    { value: "curd", label: "Curd" },
    { value: "butter", label: "Butter" },
    { value: "ghee", label: "Ghee" },
    { value: "cheese", label: "Cheese" },
    { value: "paneer", label: "Paneer" },
    { value: "ice_cream", label: "Ice Cream" },
    { value: "buttermilk", label: "Buttermilk" },
    { value: "sweets", label: "Sweets" },
    { value: "other", label: "Other" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">HSN Codes</h2>
            <p className="text-gray-500">Manage Harmonized System of Nomenclature codes for dairy products</p>
          </div>
          <Button onClick={openAddDialog} className="bg-[#4AB3E8] hover:bg-[#3a9fd4]">
            <Plus className="h-4 w-4 mr-2" />
            Add HSN Code
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>HSN Code List</CardTitle>
                <CardDescription>All HSN codes used for E-way Bill generation</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search HSN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : hsnCodes.length === 0 ? (
              <div className="text-center py-12">
                <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No HSN Codes Found</h3>
                <p className="text-gray-500 mb-4">Add HSN codes to use in E-way Bill generation</p>
                <Button onClick={openAddDialog} className="bg-[#4AB3E8] hover:bg-[#3a9fd4]">
                  <Plus className="h-4 w-4 mr-2" />
                  Add HSN Code
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HSN Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>GST Rate</TableHead>
                    <TableHead>Cess</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hsnCodes.map((hsn) => (
                    <TableRow key={hsn.id}>
                      <TableCell className="font-mono font-medium">{hsn.hsnCode}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{hsn.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {hsn.category?.replace('_', ' ') || 'Other'}
                        </Badge>
                      </TableCell>
                      <TableCell>{hsn.gstRate}%</TableCell>
                      <TableCell>{hsn.cessRate}%</TableCell>
                      <TableCell>{hsn.unit}</TableCell>
                      <TableCell>
                        <Badge className={hsn.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {hsn.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHsn ? "Edit HSN Code" : "Add New HSN Code"}</DialogTitle>
              <DialogDescription>
                Enter the HSN code details for dairy products
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>HSN Code *</Label>
                  <Input 
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({...formData, hsnCode: e.target.value})}
                    placeholder="04011000"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={formData.category}
                    onValueChange={(v) => setFormData({...formData, category: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Fresh milk, not concentrated"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>GST Rate (%)</Label>
                  <Input 
                    type="number"
                    value={formData.gstRate}
                    onChange={(e) => setFormData({...formData, gstRate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Cess Rate (%)</Label>
                  <Input 
                    type="number"
                    value={formData.cessRate}
                    onChange={(e) => setFormData({...formData, cessRate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Default Unit</Label>
                  <Select 
                    value={formData.unit}
                    onValueChange={(v) => setFormData({...formData, unit: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LTR">Litre</SelectItem>
                      <SelectItem value="KGS">Kilogram</SelectItem>
                      <SelectItem value="NOS">Numbers</SelectItem>
                      <SelectItem value="PAC">Packs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="bg-[#4AB3E8] hover:bg-[#3a9fd4]"
              >
                {createMutation.isPending ? "Saving..." : "Save HSN Code"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
