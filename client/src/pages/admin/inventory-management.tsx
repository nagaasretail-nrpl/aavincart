import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatTimestamp } from '@/lib/format-timestamp';
import AdminLayout from "./layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Warehouse, Search, Edit, Save, X, ArrowLeft, 
  RefreshCw, Package, Users, TrendingUp
} from "lucide-react";

interface InventoryItem {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitType: string | null;
  lastPurchaseDate: string | null;
  lastPurchaseQty: number | null;
  createdAt: string;
  updatedAt: string;
}

interface EditDialogState {
  open: boolean;
  item: InventoryItem | null;
  newQuantity: number;
  notes: string;
}

export default function InventoryManagement() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialog, setEditDialog] = useState<EditDialogState>({
    open: false,
    item: null,
    newQuantity: 0,
    notes: ""
  });

  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (user.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "This page is for District Union admins only",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  const { data: inventoryData, isLoading, refetch } = useQuery<InventoryItem[]>({
    queryKey: ["/api/admin/inventory"],
    enabled: !!user && user.role === 'admin'
  });

  const { data: usersData } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!user && user.role === 'admin'
  });

  const updateMutation = useMutation({
    mutationFn: async ({ inventoryId, quantity, notes }: { inventoryId: string; quantity: number; notes: string }) => {
      return apiRequest('PATCH', `/api/admin/inventory/${inventoryId}`, { quantity, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inventory"] });
      toast({
        title: "Success",
        description: "Inventory updated successfully"
      });
      setEditDialog({ open: false, item: null, newQuantity: 0, notes: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory",
        variant: "destructive"
      });
    }
  });

  const inventory = inventoryData || [];
  const users = usersData || [];

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || userId;
  };

  const getUserRole = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.pricingRole || '-';
  };

  const filteredInventory = inventory.filter(item => 
    item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getUserName(item.userId).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedByUser = filteredInventory.reduce((acc, item) => {
    if (!acc[item.userId]) {
      acc[item.userId] = [];
    }
    acc[item.userId].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  const handleEdit = (item: InventoryItem) => {
    setEditDialog({
      open: true,
      item,
      newQuantity: item.quantity,
      notes: ""
    });
  };

  const handleSave = () => {
    if (!editDialog.item) return;
    updateMutation.mutate({
      inventoryId: editDialog.item.id,
      quantity: editDialog.newQuantity,
      notes: editDialog.notes
    });
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  const totalProducts = new Set(inventory.map(i => i.productId)).size;
  const totalUsers = new Set(inventory.map(i => i.userId)).size;
  const totalStock = inventory.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold">Inventory Management</h1>
            <p className="text-sm text-muted-foreground">Manage B2B user inventory</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">B2B Users with Inventory</p>
                  <p className="text-3xl font-bold">{totalUsers}</p>
                </div>
                <Users className="h-10 w-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Products Tracked</p>
                  <p className="text-3xl font-bold">{totalProducts}</p>
                </div>
                <Package className="h-10 w-10 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Stock Units</p>
                  <p className="text-3xl font-bold">{totalStock}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Search Inventory</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by product name or user name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p>Loading inventory data...</p>
            </CardContent>
          </Card>
        ) : Object.keys(groupedByUser).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Inventory Records</h3>
              <p className="text-muted-foreground">
                Inventory will be automatically created when B2B orders are delivered.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByUser).map(([userId, items]) => (
              <Card key={userId}>
                <CardHeader className="bg-gray-50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <span>{getUserName(userId)}</span>
                      <Badge variant="secondary">{getUserRole(userId)}</Badge>
                    </div>
                    <span className="text-sm font-normal text-muted-foreground">
                      {items.length} products
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4 font-medium">Product</th>
                          <th className="text-right py-3 px-4 font-medium">Quantity</th>
                          <th className="text-right py-3 px-4 font-medium">Last Purchase</th>
                          <th className="text-right py-3 px-4 font-medium">Last Qty</th>
                          <th className="text-center py-3 px-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                {item.unitType && (
                                  <p className="text-sm text-muted-foreground">{item.unitType}</p>
                                )}
                              </div>
                            </td>
                            <td className="text-right py-3 px-4">
                              <Badge variant={item.quantity > 10 ? "default" : item.quantity > 0 ? "secondary" : "destructive"}>
                                {item.quantity} {item.unitType || 'units'}
                              </Badge>
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                              {item.lastPurchaseDate 
                                ? formatTimestamp(item.lastPurchaseDate)
                                : '-'}
                            </td>
                            <td className="text-right py-3 px-4">
                              {item.lastPurchaseQty || '-'}
                            </td>
                            <td className="text-center py-3 px-4">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEdit(item)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, item: null, newQuantity: 0, notes: "" })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Inventory</DialogTitle>
            </DialogHeader>
            {editDialog.item && (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Product</Label>
                  <p className="font-medium">{editDialog.item.productName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="font-medium">{getUserName(editDialog.item.userId)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Current Quantity</Label>
                  <p className="font-medium">{editDialog.item.quantity} {editDialog.item.unitType || 'units'}</p>
                </div>
                <div>
                  <Label htmlFor="newQuantity">New Quantity</Label>
                  <Input
                    id="newQuantity"
                    type="number"
                    min="0"
                    value={editDialog.newQuantity}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, newQuantity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Adjustment Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Reason for adjustment (optional)"
                    value={editDialog.notes}
                    onChange={(e) => setEditDialog(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditDialog({ open: false, item: null, newQuantity: 0, notes: "" })}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </AdminLayout>
  );
}
