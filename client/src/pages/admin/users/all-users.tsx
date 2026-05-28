import { useState, useEffect, useRef } from 'react';
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
  ArrowLeft, 
  Search, 
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MoreHorizontal,
  Download,
  Upload,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';
import { downloadSampleExcel, SAMPLE_EXCEL_CONFIGS, parseXlsxToRows } from '@/lib/excel-utils';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  pricingTier: string;
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
  createdAt: string;
  orderCount: number;
}

export default function AllUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', role: 'consumer', pricingTier: 'mrp' });
  const [editUser, setEditUser] = useState({ name: '', email: '', phone: '', role: '', pricingTier: '', status: 'active' as string });
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [localUsers, setLocalUsers] = useState<User[]>([]);

  const { data: fetchedUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => [
      { 
        id: '1', 
        name: 'Danilo Santos', 
        email: 'danilo@devstudio.com.br', 
        phone: '+91 9843777277',
        role: 'customer',
        pricingTier: 'mrp',
        status: 'active',
        createdAt: '2025-12-15',
        orderCount: 15
      },
      { 
        id: '2', 
        name: 'Tester Deee', 
        email: 'tester@tester.com', 
        phone: '+91 9843777278',
        role: 'customer',
        pricingTier: 'retailer',
        status: 'active',
        createdAt: '2025-12-20',
        orderCount: 8
      },
      { 
        id: '3', 
        name: 'WT Nyou', 
        email: 'wentakn@gmail.com', 
        phone: '+91 7088210968',
        role: 'dealer',
        pricingTier: 'dealer',
        status: 'active',
        createdAt: '2026-01-05',
        orderCount: 42
      },
      { 
        id: '4', 
        name: 'PRUEBAS PRUEBAS', 
        email: 'pruebas123@hotmail.com', 
        phone: '+91 3217471743',
        role: 'wholesale_dealer',
        pricingTier: 'wholesale',
        status: 'active',
        createdAt: '2026-01-10',
        orderCount: 156
      },
      { 
        id: '5', 
        name: 'Fg Fg', 
        email: 'xxi@xxi.com', 
        phone: '+91 9000000001',
        role: 'customer',
        pricingTier: 'mrp',
        status: 'active',
        createdAt: '2026-01-15',
        orderCount: 3
      },
      { 
        id: '6', 
        name: 'Basia Booker', 
        email: 'tyus@mailinator.com', 
        phone: '+91 296',
        role: 'inter_union',
        pricingTier: 'inter_union',
        status: 'pending',
        createdAt: '2026-01-28',
        orderCount: 0
      },
    ],
  });

  // Initialize local users from fetched data
  useEffect(() => {
    if (fetchedUsers.length > 0 && localUsers.length === 0) {
      setLocalUsers(fetchedUsers);
    }
  }, [fetchedUsers]);

  // Use localUsers if available, otherwise use fetchedUsers
  const users = localUsers.length > 0 ? localUsers : fetchedUsers;

  const addUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return userData;
    },
    onSuccess: (userData) => {
      const newUserData: User = {
        id: String(Date.now()),
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        pricingTier: userData.pricingTier,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
        orderCount: 0
      };
      setLocalUsers(prev => [...prev, newUserData]);
      toast({
        title: "Success",
        description: "User added successfully",
      });
      setIsAddDialogOpen(false);
      setNewUser({ name: '', email: '', phone: '', role: 'consumer', pricingTier: 'mrp' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: typeof editUser & { id: string }) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return userData;
    },
    onSuccess: (userData) => {
      setLocalUsers(prev => prev.map(user => 
        user.id === userData.id 
          ? { ...user, name: userData.name, email: userData.email, phone: userData.phone, role: userData.role, pricingTier: userData.pricingTier, status: userData.status as 'active' | 'inactive' | 'pending' }
          : user
      ));
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return userId;
    },
    onSuccess: (userId) => {
      setLocalUsers(prev => prev.filter(user => user.id !== userId));
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-green-100 text-green-800', label: 'Active' },
      inactive: { className: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPricingTierBadge = (tier: string) => {
    const tierConfig: Record<string, { className: string; label: string }> = {
      federation: { className: 'bg-purple-100 text-purple-800', label: 'Federation' },
      inter_union: { className: 'bg-blue-100 text-blue-800', label: 'Inter Union' },
      wholesale: { className: 'bg-indigo-100 text-indigo-800', label: 'Wholesale' },
      dealer: { className: 'bg-orange-100 text-orange-800', label: 'Dealer' },
      retailer: { className: 'bg-teal-100 text-teal-800', label: 'Retailer' },
      mrp: { className: 'bg-gray-100 text-gray-800', label: 'MRP/Consumer' },
    };
    const config = tierConfig[tier] || tierConfig.mrp;
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

  const HEADER_MAP: Record<string, string> = {
    'full name': 'name', 'full name *': 'name', 'name': 'name',
    'email': 'email', 'email *': 'email',
    'phone': 'phone', 'phone *': 'phone', 'mobile': 'phone',
    'role': 'role', 'role *': 'role',
    'pricing tier': 'pricingTier', 'pricingtier': 'pricingTier',
    'status': 'status',
    'address': 'address',
    'district': 'district',
    'gstin': 'gstin', 'gstin (b2b only)': 'gstin', 'gst number': 'gstin',
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setImportResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const { headers, rows } = await parseXlsxToRows(buffer);
      const colMap: Record<string, string> = {};
      headers.filter(Boolean).forEach(h => {
        const normalized = h.toLowerCase().trim().replace(/\s+/g, ' ');
        if (HEADER_MAP[normalized]) {
          colMap[h] = HEADER_MAP[normalized];
        } else {
          for (const [pattern, field] of Object.entries(HEADER_MAP)) {
            if (normalized.includes(pattern)) { colMap[h] = field; break; }
          }
        }
      });
      const mapped = rows.map(raw => {
        const obj: Record<string, string> = {};
        for (const [origHeader, value] of Object.entries(raw)) {
          const mappedKey = colMap[origHeader];
          if (mappedKey) obj[mappedKey] = String(value ?? '').trim();
        }
        return obj;
      }).filter(r => r.name || r.phone || r.email);
      setParsedRows(mapped);
      setShowUploadDialog(true);
    } catch (err) {
      toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      toast({ title: 'No rows', description: 'No valid rows found in the file.', variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      const res = await apiRequest('POST', '/api/admin/users/bulk-import', { rows: parsedRows });
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
      setImporting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-all-users">
                All Users
              </h1>
              <p className="text-gray-600">Manage all platform users and their pricing tiers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadSampleExcel(SAMPLE_EXCEL_CONFIGS.allUsers)}>
              <Download className="h-4 w-4 mr-2" />
              Sample Excel
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={parsing}>
              {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
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
                  <Button data-testid="button-add-user">
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
            <div className="flex items-center gap-4 mb-6">
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
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
                  data-testid="input-search-users"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Pricing Tier</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
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
                    <TableCell>{getPricingTierBadge(user.pricingTier)}</TableCell>
                    <TableCell>{user.orderCount}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditClick(user)}
                          data-testid={`edit-user-${user.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                          data-testid={`delete-user-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
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

        {/* Edit User Dialog */}
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
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

        {/* Bulk Import Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={(open) => { setShowUploadDialog(open); if (!open) { setParsedRows([]); setImportResult(null); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Import Users from Excel
              </DialogTitle>
              <DialogDescription>
                Review parsed data before importing
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {!importResult ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{parsedRows.length} rows found</span>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Pricing Tier</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedRows.slice(0, 50).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs">{idx + 1}</TableCell>
                            <TableCell className="text-xs">{row.name || '—'}</TableCell>
                            <TableCell className="text-xs">{row.email || '—'}</TableCell>
                            <TableCell className="text-xs">{row.phone || '—'}</TableCell>
                            <TableCell className="text-xs">{row.role || '—'}</TableCell>
                            <TableCell className="text-xs">{row.pricingTier || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {parsedRows.length > 50 && (
                      <p className="text-xs text-gray-500 p-2 text-center">...and {parsedRows.length - 50} more rows</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                      <div className="text-lg font-semibold text-green-700">{importResult.created || 0}</div>
                      <div className="text-xs text-green-600">Created</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                      <div className="text-lg font-semibold text-blue-700">{importResult.updated || 0}</div>
                      <div className="text-xs text-blue-600">Updated</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                      <AlertCircle className="h-5 w-5 text-gray-500 mx-auto mb-1" />
                      <div className="text-lg font-semibold text-gray-700">{importResult.skipped || 0}</div>
                      <div className="text-xs text-gray-500">Skipped</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                      <div className="text-lg font-semibold text-red-700">{importResult.errors?.length || 0}</div>
                      <div className="text-xs text-red-600">Errors</div>
                    </div>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="max-h-32 overflow-auto bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-red-800 mb-1">Errors:</p>
                      {importResult.errors.slice(0, 10).map((err: any, i: number) => (
                        <p key={i} className="text-xs text-red-700">
                          Row {err.row || i + 1}: {err.message || err.error || JSON.stringify(err)}
                        </p>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-xs text-red-500 mt-1">...and {importResult.errors.length - 10} more errors</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              {!importResult ? (
                <>
                  <Button variant="outline" onClick={() => { setShowUploadDialog(false); setParsedRows([]); }}>Cancel</Button>
                  <Button onClick={handleImport} disabled={importing || parsedRows.length === 0}>
                    {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</> : `Import ${parsedRows.length} Users`}
                  </Button>
                </>
              ) : (
                <Button onClick={() => { setShowUploadDialog(false); setParsedRows([]); setImportResult(null); }}>Close</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
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
      </div>
    </AdminLayout>
  );
}
