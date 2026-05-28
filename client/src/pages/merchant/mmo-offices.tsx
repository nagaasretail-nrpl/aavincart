import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Building2, Plus, MapPin, Edit, Trash2, Route, Phone, User, ArrowRight } from "lucide-react";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";

interface MmoOffice {
  id: string;
  unionId: string;
  officeName: string;
  officeCode: string;
  parentId: string | null;
  address: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  isActive: boolean;
  sequenceNo: number;
}

export default function MmoOfficesPage() {
  return (
    <MerchantLayout>
      <MmoOfficesContent />
    </MerchantLayout>
  );
}

function MmoOfficesContent() {
  const { toast } = useToast();
  const { staffSession } = useMerchantContext();
  const isFieldOps = staffSession?.isStaff && staffSession.accessTier === "field_ops";
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOffice, setEditOffice] = useState<MmoOffice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ officeName: "", officeCode: "", parentId: "", address: "", contactPerson: "", contactPhone: "" });

  const { data: offices = [], isLoading } = useQuery<MmoOffice[]>({ queryKey: ["/api/mmo/offices"] });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/mmo/offices", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/offices"] }); toast({ title: "MMO Office created" }); closeDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/mmo/offices/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/offices"] }); toast({ title: "MMO Office updated" }); closeDialog(); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/mmo/offices/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/mmo/offices"] }); toast({ title: "MMO Office removed" }); setDeleteId(null); },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditOffice(null);
    setForm({ officeName: "", officeCode: "", parentId: "", address: "", contactPerson: "", contactPhone: "" });
  }

  function openCreate(parentId?: string) {
    setEditOffice(null);
    setForm({ officeName: "", officeCode: "", parentId: parentId || "", address: "", contactPerson: "", contactPhone: "" });
    setDialogOpen(true);
  }

  function openEdit(office: MmoOffice, e: React.MouseEvent) {
    e.stopPropagation();
    setEditOffice(office);
    setForm({
      officeName: office.officeName,
      officeCode: office.officeCode,
      parentId: office.parentId || "",
      address: office.address || "",
      contactPerson: office.contactPerson || "",
      contactPhone: office.contactPhone || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.officeName || !form.officeCode) {
      toast({ title: "Please fill in Office Name and Code", variant: "destructive" });
      return;
    }
    const payload: any = { ...form, parentId: form.parentId || null };
    if (editOffice) updateMutation.mutate({ id: editOffice.id, data: payload });
    else createMutation.mutate(payload);
  }

  const topLevelOffices = offices.filter(o => !o.parentId);
  const getSubOffices = (parentId: string) => offices.filter(o => o.parentId === parentId);

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">MMO Offices</h1>
          <p className="text-sm text-muted-foreground">Manage Milk Marketing Offices, routes, and delivery points</p>
        </div>
        {!isFieldOps && (
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4 mr-2" /> Add MMO Office
          </Button>
        )}
      </div>

      {offices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold mb-1">No MMO Offices Yet</h2>
            <p className="text-sm text-muted-foreground mb-4">Create your first MMO office to start managing routes and dispatch</p>
            {!isFieldOps && <Button onClick={() => openCreate()}><Plus className="h-4 w-4 mr-2" /> Create MMO Office</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topLevelOffices.map(office => {
            const subOffices = getSubOffices(office.id);
            return (
              <Card
                key={office.id}
                className="cursor-pointer hover:shadow-lg transition-all group border-l-4 border-l-blue-500 hover:border-l-blue-600"
                onClick={() => navigate(`/merchant/mmo/${office.id}/routes`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base">{office.officeName}</h3>
                        <Badge variant="outline" className="text-[10px] font-mono mt-0.5">{office.officeCode}</Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors mt-1" />
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                    {office.contactPerson && (
                      <p className="flex items-center gap-1.5"><User className="h-3 w-3 shrink-0" />{office.contactPerson}</p>
                    )}
                    {office.contactPhone && (
                      <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 shrink-0" />{office.contactPhone}</p>
                    )}
                    {office.address && (
                      <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /><span className="line-clamp-1">{office.address}</span></p>
                    )}
                  </div>

                  {subOffices.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">Sub-MMO Offices</p>
                      <div className="flex flex-wrap gap-1">
                        {subOffices.map(sub => (
                          <Badge key={sub.id} variant="secondary" className="text-[10px] cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/merchant/mmo/${sub.id}/routes`); }}>
                            {sub.officeName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={(e) => { e.stopPropagation(); navigate(`/merchant/mmo/${office.id}/routes`); }}>
                      <Route className="h-3 w-3 mr-1" /> View Routes
                    </Button>
                    {!isFieldOps && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => openEdit(office, e)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteId(office.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openCreate(office.id); }}>
                          <Plus className="h-3 w-3 mr-1" /> Sub-MMO
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={v => !v && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editOffice ? "Edit MMO Office" : form.parentId ? "Add Sub-MMO Office" : "Add MMO Office"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Office Name *</Label><Input value={form.officeName} onChange={e => setForm(f => ({ ...f, officeName: e.target.value }))} placeholder="e.g. Edappadi MMO" /></div>
            <div><Label>Office Code *</Label><Input value={form.officeCode} onChange={e => setForm(f => ({ ...f, officeCode: e.target.value }))} placeholder="e.g. EDPY" /></div>
            {!editOffice && !form.parentId && topLevelOffices.length > 0 && (
              <div>
                <Label>Parent MMO (for Sub-MMO)</Label>
                <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="None (Top-level)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top-level)</SelectItem>
                    {topLevelOffices.map(o => <SelectItem key={o.id} value={o.id}>{o.officeName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} placeholder="Name" /></div>
            <div><Label>Contact Phone</Label><Input value={form.contactPhone} onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} placeholder="+91..." /></div>
            <div><Label>Address</Label><Textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Office address" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>{editOffice ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete MMO Office?</AlertDialogTitle><AlertDialogDescription>This will deactivate the MMO office and all associated routes.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
