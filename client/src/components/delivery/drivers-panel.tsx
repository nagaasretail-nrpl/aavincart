import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Truck, Search, MapPin, Plus, Pencil, Trash2, Eye, EyeOff,
  Loader2, Mail, Phone, Download, Upload, User, CreditCard,
  CheckCircle, Activity,
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { buildXlsxBuffer, parseXlsxToRows } from '@/lib/excel-utils';

interface DeliveryDriver {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  unionId: string | null;
  assignedSegment: string | null;
  createdAt: string | null;
}

interface DriversPanelProps {
  merchantId?: string;
  isAdmin: boolean;
  unions?: { value: string; label: string }[];
}

const DEFAULT_UNIONS = [
  { value: "chennai", label: "Chennai Union" },
  { value: "coimbatore", label: "Coimbatore Union" },
  { value: "cuddalore", label: "Cuddalore Union" },
  { value: "dharmapuri", label: "Dharmapuri Union" },
  { value: "dindigul", label: "Dindigul Union" },
  { value: "erode", label: "Erode Union" },
  { value: "kancheepuram", label: "Kancheepuram Union" },
  { value: "kanniyakumari", label: "Kanniyakumari Union" },
  { value: "karur", label: "Karur Union" },
  { value: "krishnagiri", label: "Krishnagiri Union" },
  { value: "madurai", label: "Madurai Union" },
  { value: "nagapattinam", label: "Nagapattinam Union" },
  { value: "namakkal", label: "Namakkal Union" },
  { value: "nilgiris", label: "Nilgiris Union" },
  { value: "perambalur", label: "Perambalur Union" },
  { value: "pudukottai", label: "Pudukottai Union" },
  { value: "ramanathapuram", label: "Ramanathapuram Union" },
  { value: "salem", label: "Salem Union" },
  { value: "sivagangai", label: "Sivagangai Union" },
  { value: "thanjavur", label: "Thanjavur Union" },
  { value: "theni", label: "Theni Union" },
  { value: "thiruvallur", label: "Thiruvallur Union" },
  { value: "tirunelveli", label: "Tirunelveli Union" },
  { value: "tiruppur", label: "Tiruppur Union" },
  { value: "tiruchirappalli", label: "Tiruchirappalli Union" },
  { value: "tiruvannamalai", label: "Tiruvannamalai Union" },
  { value: "vellore", label: "Vellore Union" },
  { value: "villupuram", label: "Villupuram Union" },
  { value: "virudhunagar", label: "Virudhunagar Union" },
  { value: "ariyalur", label: "Ariyalur Union" },
  { value: "tenkasi", label: "Tenkasi Union" },
];

const SEGMENTS = [
  { value: "Fresh Milk", label: "Fresh Milk" },
  { value: "Products", label: "Products" },
  { value: "Ice Cream", label: "Ice Cream" },
];

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  unionId: '',
  assignedSegment: '',
};

export default function DriversPanel({ merchantId, isAdmin, unions }: DriversPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DeliveryDriver | null>(null);
  const [deletingDriver, setDeletingDriver] = useState<DeliveryDriver | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [driverImporting, setDriverImporting] = useState(false);
  const driverFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const districtUnions = unions || DEFAULT_UNIONS;

  const { data: drivers = [], isLoading: driversLoading } = useQuery<DeliveryDriver[]>({
    queryKey: ['/api/admin/delivery-drivers'],
  });

  const createDriverMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/admin/delivery-drivers', data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Driver Created", description: "New delivery driver added successfully." });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-drivers'] });
      setShowAddDialog(false);
      setFormData(emptyForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create driver", variant: "destructive" });
    }
  });

  const updateDriverMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/admin/delivery-drivers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Driver Updated" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-drivers'] });
      setShowEditDialog(false);
      setEditingDriver(null);
      setFormData(emptyForm);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update driver", variant: "destructive" });
    }
  });

  const deleteDriverMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/delivery-drivers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Driver Deleted" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-drivers'] });
      setShowDeleteDialog(false);
      setDeletingDriver(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete driver", variant: "destructive" });
    }
  });

  const filteredDrivers = drivers.filter((driver: DeliveryDriver) =>
    driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (driver.email && driver.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (driver.phone && driver.phone.includes(searchQuery))
  );

  const getUnionLabel = (unionId: string | null) => {
    if (!unionId) return 'Not assigned';
    const union = districtUnions.find(u => u.value === unionId);
    return union ? union.label : unionId;
  };

  const openEditDialog = (driver: DeliveryDriver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone || '',
      password: '',
      unionId: driver.unionId || '',
      assignedSegment: driver.assignedSegment || '',
    });
    setShowEditDialog(true);
  };

  const handleSubmitAdd = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast({ title: "Missing Fields", description: "Name, email, and password are required", variant: "destructive" });
      return;
    }
    createDriverMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    if (!editingDriver) return;
    const updateData: any = { name: formData.name, email: formData.email, phone: formData.phone, unionId: formData.unionId, assignedSegment: formData.assignedSegment };
    if (formData.password) updateData.password = formData.password;
    updateDriverMutation.mutate({ id: editingDriver.id, data: updateData });
  };

  const handleExportDrivers = async () => {
    const rows = drivers.map(d => ({
      Name: d.name, Email: d.email, Phone: d.phone || '', Union: getUnionLabel(d.unionId), Segment: d.assignedSegment || 'All',
      Joined: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
    }));
    const buffer = await buildXlsxBuffer([{ name: 'Drivers', rows }] as any);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'delivery-drivers.xlsx'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDrivers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDriverImporting(true);
    try {
      const rows = await parseXlsxToRows(file as any);
      const res = await apiRequest('POST', '/api/admin/delivery-drivers/bulk-import', { drivers: rows });
      const data = await res.json();
      toast({ title: "Import Complete", description: `${data.created || 0} drivers imported, ${data.errors || 0} errors` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-drivers'] });
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message || "Failed to import drivers", variant: "destructive" });
    }
    setDriverImporting(false);
    if (driverFileRef.current) driverFileRef.current.value = '';
  };

  const driverFormContent = (isEdit: boolean) => (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Full Name *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Driver name" />
        </div>
        <div>
          <Label>Email / Login ID *</Label>
          <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="driver@email.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Phone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone number" />
        </div>
        <div>
          <Label>{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
          <div className="relative">
            <Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={isEdit ? 'Leave blank to keep' : 'Set password'} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      {isAdmin && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>District Union</Label>
            <Select value={formData.unionId} onValueChange={(v) => setFormData({ ...formData, unionId: v })}>
              <SelectTrigger><SelectValue placeholder="Select union" /></SelectTrigger>
              <SelectContent>
                {districtUnions.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assigned Segment</Label>
            <Select value={formData.assignedSegment} onValueChange={(v) => setFormData({ ...formData, assignedSegment: v })}>
              <SelectTrigger><SelectValue placeholder="All segments" /></SelectTrigger>
              <SelectContent>
                {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {!isAdmin && (
        <div>
          <Label>Assigned Segment</Label>
          <Select value={formData.assignedSegment} onValueChange={(v) => setFormData({ ...formData, assignedSegment: v })}>
            <SelectTrigger><SelectValue placeholder="All segments" /></SelectTrigger>
            <SelectContent>
              {SEGMENTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const activeDrivers = drivers.filter(d => d.unionId || d.assignedSegment).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-lg font-bold">Delivery Drivers ({drivers.length})</h2>
            <p className="text-xs text-muted-foreground">Manage delivery team members</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input type="file" ref={driverFileRef} onChange={handleImportDrivers} accept=".xlsx,.xls" className="hidden" />
          <Button variant="outline" size="sm" onClick={handleExportDrivers}><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button variant="outline" size="sm" onClick={() => driverFileRef.current?.click()} disabled={driverImporting}>
            {driverImporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Import
          </Button>
          <Button size="sm" onClick={() => { setFormData(emptyForm); setShowPassword(false); setShowAddDialog(true); }} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />Add Driver
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Total Drivers</p>
                <p className="text-xl sm:text-2xl font-bold">{drivers.length}</p>
              </div>
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">Assigned</p>
                <p className="text-xl sm:text-2xl font-bold">{activeDrivers}</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs">Unassigned</p>
                <p className="text-xl sm:text-2xl font-bold">{drivers.length - activeDrivers}</p>
              </div>
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Search by name, email, or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          {driversLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredDrivers.length === 0 ? (
            <div className="p-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Drivers Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'No drivers match your search.' : 'Add your first driver to get started.'}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver Name</TableHead>
                      <TableHead>Email / Login ID</TableHead>
                      <TableHead>Phone</TableHead>
                      {isAdmin && <TableHead>District Union</TableHead>}
                      <TableHead>Segment</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDrivers.map((driver) => (
                      <TableRow key={driver.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            {driver.name}
                          </div>
                        </TableCell>
                        <TableCell><div className="flex items-center gap-1 text-sm"><Mail className="h-3 w-3 text-muted-foreground" />{driver.email}</div></TableCell>
                        <TableCell>{driver.phone ? <div className="flex items-center gap-1 text-sm"><Phone className="h-3 w-3 text-muted-foreground" />{driver.phone}</div> : <span className="text-muted-foreground text-sm">-</span>}</TableCell>
                        {isAdmin && (
                          <TableCell><div className="flex items-center gap-1 text-sm"><MapPin className="h-3 w-3 text-muted-foreground" />{getUnionLabel(driver.unionId)}</div></TableCell>
                        )}
                        <TableCell>{driver.assignedSegment ? <Badge variant="outline">{driver.assignedSegment}</Badge> : <span className="text-muted-foreground text-sm">All</span>}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(driver)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => { setDeletingDriver(driver); setShowDeleteDialog(true); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-2">
                {filteredDrivers.map((driver) => (
                  <Card key={driver.id} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-sm">{driver.name}</span>
                        </div>
                        {driver.assignedSegment ? <Badge variant="outline" className="text-xs">{driver.assignedSegment}</Badge> : <Badge variant="secondary" className="text-xs">All</Badge>}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                        <span>Email: {driver.email}</span>
                        <span>Phone: {driver.phone || 'N/A'}</span>
                        {isAdmin && <span>Union: {getUnionLabel(driver.unionId)}</span>}
                        <span>Joined: {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : '-'}</span>
                      </div>
                      <div className="flex gap-1 pt-1">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditDialog(driver)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => { setDeletingDriver(driver); setShowDeleteDialog(true); }}>
                          <Trash2 className="h-3 w-3" />
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>Create a new delivery driver account</DialogDescription>
          </DialogHeader>
          {driverFormContent(false)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitAdd} disabled={createDriverMutation.isPending}>
              {createDriverMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>Update driver information</DialogDescription>
          </DialogHeader>
          {driverFormContent(true)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitEdit} disabled={updateDriverMutation.isPending}>
              {updateDriverMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
              Update Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Driver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingDriver?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingDriver && deleteDriverMutation.mutate(deletingDriver.id)}
            >
              {deleteDriverMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
