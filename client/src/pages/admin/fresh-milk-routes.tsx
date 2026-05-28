import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/pages/admin/layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface FreshMilkRoute {
  id: string;
  routeName: string;
  areaGroup: string;
  sequenceNo: number;
  isActive: boolean;
  unionId: string;
}

export default function FreshMilkRoutesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<FreshMilkRoute | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<FreshMilkRoute | null>(null);
  const [routeName, setRouteName] = useState("");
  const [areaGroup, setAreaGroup] = useState("");
  const [sequenceNo, setSequenceNo] = useState("");

  const { data: routes = [], isLoading } = useQuery<FreshMilkRoute[]>({
    queryKey: ["/api/fresh-milk/routes", "?unionId=UNI-SLM-01"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { routeName: string; areaGroup: string; sequenceNo: number; unionId: string }) => {
      await apiRequest("POST", "/api/fresh-milk/routes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fresh-milk/routes"] });
      toast({ title: "Route created successfully" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create route", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { routeName: string; areaGroup: string; sequenceNo: number } }) => {
      await apiRequest("PUT", `/api/fresh-milk/routes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fresh-milk/routes"] });
      toast({ title: "Route updated successfully" });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update route", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/fresh-milk/routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fresh-milk/routes"] });
      toast({ title: "Route deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingRoute(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete route", description: error.message, variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingRoute(null);
    setRouteName("");
    setAreaGroup("");
    setSequenceNo("");
  }

  function openCreateDialog() {
    setEditingRoute(null);
    setRouteName("");
    setAreaGroup("");
    setSequenceNo("");
    setDialogOpen(true);
  }

  function openEditDialog(route: FreshMilkRoute) {
    setEditingRoute(route);
    setRouteName(route.routeName);
    setAreaGroup(route.areaGroup);
    setSequenceNo(String(route.sequenceNo));
    setDialogOpen(true);
  }

  function openDeleteDialog(route: FreshMilkRoute) {
    setDeletingRoute(route);
    setDeleteDialogOpen(true);
  }

  function handleSubmit() {
    if (!routeName || !areaGroup || !sequenceNo) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    if (editingRoute) {
      updateMutation.mutate({
        id: editingRoute.id,
        data: { routeName, areaGroup, sequenceNo: parseInt(sequenceNo) },
      });
    } else {
      createMutation.mutate({
        routeName,
        areaGroup,
        sequenceNo: parseInt(sequenceNo),
        unionId: "UNI-SLM-01",
      });
    }
  }

  function handleDelete() {
    if (deletingRoute) {
      deleteMutation.mutate(deletingRoute.id);
    }
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Fresh Milk Routes</h1>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Route
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Route Master</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading routes...</div>
            ) : routes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No routes found. Create your first route.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">S.No</TableHead>
                    <TableHead>Route Name</TableHead>
                    <TableHead>Area Group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routes.map((route, index) => (
                    <TableRow key={route.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{route.routeName}</TableCell>
                      <TableCell>{route.areaGroup}</TableCell>
                      <TableCell>
                        {route.isActive !== false ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(route)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openDeleteDialog(route)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoute ? "Edit Route" : "Create Route"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Route Name</label>
              <Input
                placeholder="Enter route name"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Area Group</label>
              <Select value={areaGroup} onValueChange={setAreaGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Salem">Salem</SelectItem>
                  <SelectItem value="Namakkal">Namakkal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sequence No</label>
              <Input
                type="number"
                placeholder="Enter sequence number"
                value={sequenceNo}
                onChange={(e) => setSequenceNo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isMutating}>
              {isMutating ? "Saving..." : editingRoute ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setDeletingRoute(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Route</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete the route <strong>{deletingRoute?.routeName}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingRoute(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
