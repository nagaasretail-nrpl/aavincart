import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Users, 
  Search, 
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import MerchantLayout from './layout';
import { useMerchantContext } from './context';
import { downloadSampleExcel, buildXlsxBuffer, parseXlsxToRows, SAMPLE_EXCEL_CONFIGS } from '@/lib/excel-utils';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  pricingTier: string;
  pricingRole: string;
  status: string;
  avatar?: string;
  createdAt: string;
  businessName?: string;
  gstNumber?: string;
  district?: string;
  districtUnion?: string;
}

export default function MerchantUsers() {
  const { toast } = useToast();
  const { merchantId } = useMerchantContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'consumer', pricingTier: 'mrp', password: '' });
  const [editUser, setEditUser] = useState({ name: '', email: '', phone: '', role: '', pricingTier: '', status: 'active' as string });
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [parsedImportRows, setParsedImportRows] = useState<Record<string, any>[]>([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importingUsers, setImportingUsers] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const res = await apiRequest('POST', '/api/admin/users', userData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Success", description: "User added successfully" });
      setIsAddDialogOpen(false);
      setNewUser({ name: '', email: '', phone: '', role: 'consumer', pricingTier: 'mrp', password: '' });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: typeof editUser & { id: string }) => {
      const { id, ...updates } = userData;
      const res = await apiRequest('PATCH', `/api/admin/users/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Success", description: "User updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "Success", description: "User deleted successfully" });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setEditUser({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      pricingTier: user.pricingTier,
      status: user.status
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleExportExcel = async () => {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Pricing Tier', 'Status', 'Business Name', 'Created'];
    const dataRows = filteredUsers.map(u => [
      u.name, u.email, u.phone, u.role.replace('_', ' '), u.pricingRole || u.pricingTier || '', u.status, u.businessName || '', u.createdAt || ''
    ]);
    const xlsxBuf = await buildXlsxBuffer([{ name: 'Users', rows: [headers, ...dataRows] }]);
    const blob = new Blob([xlsxBuf.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Users_Export.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${filteredUsers.length} users exported to Excel` });
  };

  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportParsing(true);
    setImportResult(null);
    setParsedImportRows([]);
    try {
      const buffer = await file.arrayBuffer();
      const { headers, rows } = await parseXlsxToRows(buffer);
      if (rows.length === 0) {
        toast({ title: 'Empty file', description: 'No data rows found in the Excel file.', variant: 'destructive' });
        return;
      }
      const mapped = rows.map((row) => {
        const name = row['Name'] || row['name'] || row['Full Name'] || row['full name'] || '';
        const email = row['Email'] || row['email'] || '';
        const phone = row['Phone'] || row['phone'] || row['Mobile'] || row['mobile'] || '';
        const role = row['Role'] || row['role'] || 'consumer';
        const pricingTier = row['Pricing Tier'] || row['pricing tier'] || row['PricingTier'] || 'mrp';
        const password = row['Password'] || row['password'] || '';
        return { name, email, phone, role, pricingTier, password };
      }).filter((r) => r.name || r.email || r.phone);
      setParsedImportRows(mapped);
      setIsImportDialogOpen(true);
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setImportParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleBulkImport = async () => {
    if (parsedImportRows.length === 0) return;
    setImportingUsers(true);
    try {
      const res = await apiRequest('POST', '/api/admin/users/bulk-import', {
        rows: parsedImportRows,
      });
      const result = await res.json();
      setImportResult(result);
      if (result.created > 0 || result.updated > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
        toast({
          title: 'Import Successful',
          description: `Created: ${result.created || 0}, Updated: ${result.updated || 0}${result.errors?.length ? `, Errors: ${result.errors.length}` : ''}`,
        });
      }
    } catch (err) {
      toast({ title: 'Import Failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setImportingUsers(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-green-100 text-green-800', label: 'Active' },
      approved: { className: 'bg-green-100 text-green-800', label: 'Approved' },
      inactive: { className: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      rejected: { className: 'bg-red-100 text-red-800', label: 'Rejected' },
    };
    const config = statusConfig[status] || { className: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPricingTierBadge = (tier: string) => {
    const tierConfig: Record<string, { className: string; label: string }> = {
      federation: { className: 'bg-purple-100 text-purple-800', label: 'Federation' },
      FEDERATION: { className: 'bg-purple-100 text-purple-800', label: 'Federation' },
      inter_union: { className: 'bg-blue-100 text-blue-800', label: 'Inter Union' },
      INTER_UNION: { className: 'bg-blue-100 text-blue-800', label: 'Inter Union' },
      wholesale: { className: 'bg-indigo-100 text-indigo-800', label: 'Wholesale' },
      WHOLESALE_DEALER: { className: 'bg-indigo-100 text-indigo-800', label: 'Wholesale' },
      dealer: { className: 'bg-orange-100 text-orange-800', label: 'Dealer' },
      DEALER: { className: 'bg-orange-100 text-orange-800', label: 'Dealer' },
      retailer: { className: 'bg-teal-100 text-teal-800', label: 'Retailer' },
      RETAILER: { className: 'bg-teal-100 text-teal-800', label: 'Retailer' },
      mrp: { className: 'bg-gray-100 text-gray-800', label: 'MRP/Consumer' },
      MRP: { className: 'bg-gray-100 text-gray-800', label: 'MRP/Consumer' },
    };
    const config = tierConfig[tier] || { className: 'bg-gray-100 text-gray-800', label: tier || 'N/A' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
                         (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.phone || '').includes(searchQuery);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              All Users
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage all platform users and their pricing tiers</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => downloadSampleExcel(SAMPLE_EXCEL_CONFIGS.allUsers)}>
              <Download className="h-4 w-4 mr-2" />
              Sample Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportFileSelect}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={importParsing}>
              {importParsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import Excel
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Management</span>
                </CardTitle>
                <CardDescription>View and manage all registered users</CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add new
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Create a new user account</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pricing-tier">Pricing Tier</Label>
                      <Select value={newUser.pricingTier} onValueChange={(value) => setNewUser({ ...newUser, pricingTier: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pricing tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="federation">Federation</SelectItem>
                          <SelectItem value="inter_union">Inter Union</SelectItem>
                          <SelectItem value="wholesale">Wholesale Dealer</SelectItem>
                          <SelectItem value="dealer">Dealer</SelectItem>
                          <SelectItem value="retailer">Retailer</SelectItem>
                          <SelectItem value="mrp">MRP/Consumer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="Enter password (min 6 characters)"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => addUserMutation.mutate(newUser)} disabled={addUserMutation.isPending}>
                      {addUserMutation.isPending ? 'Adding...' : 'Add User'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Show</span>
                <Select defaultValue="10">
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-500">entries</span>
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="dealer">Dealer</SelectItem>
                  <SelectItem value="wholesale_dealer">Wholesale Dealer</SelectItem>
                  <SelectItem value="inter_union">Inter Union</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex-1" />
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Pricing Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                      <TableCell>{getPricingTierBadge(user.pricingRole || user.pricingTier)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditClick(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteClick(user)}
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
            
            {filteredUsers.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No users found</p>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing 1 to {filteredUsers.length} of {users.length} entries
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button size="sm" className="bg-blue-500">1</Button>
                <Button variant="outline" size="sm">Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information for {selectedUser?.name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={editUser.phone}
                  onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="wholesale_dealer">Wholesale Dealer</SelectItem>
                    <SelectItem value="inter_union">Inter Union</SelectItem>
                    <SelectItem value="federation">Federation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pricing-tier">Pricing Tier</Label>
                <Select value={editUser.pricingTier} onValueChange={(value) => setEditUser({ ...editUser, pricingTier: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="federation">Federation</SelectItem>
                    <SelectItem value="inter_union">Inter Union</SelectItem>
                    <SelectItem value="wholesale">Wholesale Dealer</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                    <SelectItem value="mrp">MRP/Consumer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editUser.status} onValueChange={(value) => setEditUser({ ...editUser, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => selectedUser && updateUserMutation.mutate({ ...editUser, id: selectedUser.id })} 
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  This will permanently delete the user account and all associated data including orders history.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive"
                onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)} 
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isImportDialogOpen} onOpenChange={(open) => { if (!open) { setIsImportDialogOpen(false); setImportResult(null); setParsedImportRows([]); } }}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Import Users from Excel
              </DialogTitle>
              <DialogDescription>
                Review the parsed data before importing
              </DialogDescription>
            </DialogHeader>

            {importResult ? (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Import Complete</p>
                    <p className="text-sm text-green-700">
                      Created: {importResult.created || 0}, Updated: {importResult.updated || 0}
                      {importResult.errors?.length > 0 && `, Errors: ${importResult.errors.length}`}
                    </p>
                  </div>
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-700">Errors:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((err: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{typeof err === 'string' ? err : err.message || JSON.stringify(err)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button onClick={() => { setIsImportDialogOpen(false); setImportResult(null); setParsedImportRows([]); }}>
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>{parsedImportRows.length} rows ready to import</span>
                  </div>
                </div>

                {parsedImportRows.length > 0 && (
                  <div className="border rounded-lg overflow-x-auto max-h-60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Email</TableHead>
                          <TableHead className="text-xs">Phone</TableHead>
                          <TableHead className="text-xs">Role</TableHead>
                          <TableHead className="text-xs">Pricing Tier</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedImportRows.slice(0, 50).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{i + 1}</TableCell>
                            <TableCell className="text-xs">{row.name}</TableCell>
                            <TableCell className="text-xs">{row.email}</TableCell>
                            <TableCell className="text-xs">{row.phone}</TableCell>
                            <TableCell className="text-xs">{row.role}</TableCell>
                            <TableCell className="text-xs">{row.pricingTier}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {parsedImportRows.length > 50 && (
                      <p className="text-xs text-gray-500 p-2 text-center">
                        Showing first 50 of {parsedImportRows.length} rows
                      </p>
                    )}
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); setParsedImportRows([]); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkImport} disabled={importingUsers || parsedImportRows.length === 0}>
                    {importingUsers ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Import {parsedImportRows.length} Users
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MerchantLayout>
  );
}
