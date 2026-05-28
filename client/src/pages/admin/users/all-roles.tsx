import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  ArrowLeft, 
  Search, 
  Plus,
  Pencil,
  Trash2,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

interface Role {
  id: string;
  name: string;
  accessCount: number;
  permissions: string[];
  description?: string;
}

const allPermissions = [
  { id: 'dashboard', label: 'Dashboard Access' },
  { id: 'orders_view', label: 'View Orders' },
  { id: 'orders_manage', label: 'Manage Orders' },
  { id: 'products_view', label: 'View Products' },
  { id: 'products_manage', label: 'Manage Products' },
  { id: 'users_view', label: 'View Users' },
  { id: 'users_manage', label: 'Manage Users' },
  { id: 'payments_view', label: 'View Payments' },
  { id: 'payments_manage', label: 'Manage Payments' },
  { id: 'reports_view', label: 'View Reports' },
  { id: 'reports_export', label: 'Export Reports' },
  { id: 'settings_view', label: 'View Settings' },
  { id: 'settings_manage', label: 'Manage Settings' },
  { id: 'production_view', label: 'View Production' },
  { id: 'production_manage', label: 'Manage Production' },
  { id: 'delivery_view', label: 'View Deliveries' },
  { id: 'delivery_manage', label: 'Manage Deliveries' },
];

export default function AllRoles() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({ name: '', permissions: [] as string[] });

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles'],
    queryFn: async () => [
      { 
        id: '1', 
        name: 'Federation Admin',
        accessCount: 428,
        permissions: allPermissions.map(p => p.id),
        description: 'Full access to all platform features'
      },
      { 
        id: '2', 
        name: 'Union Manager',
        accessCount: 156,
        permissions: ['dashboard', 'orders_view', 'orders_manage', 'products_view', 'products_manage', 'reports_view'],
        description: 'District union management access'
      },
      { 
        id: '3', 
        name: 'Dealer',
        accessCount: 89,
        permissions: ['dashboard', 'orders_view', 'products_view', 'reports_view'],
        description: 'Dealer ordering and viewing access'
      },
      { 
        id: '4', 
        name: 'Retailer',
        accessCount: 234,
        permissions: ['dashboard', 'orders_view', 'products_view'],
        description: 'Retailer limited access'
      },
      { 
        id: '5', 
        name: 'Production Manager',
        accessCount: 45,
        permissions: ['dashboard', 'production_view', 'production_manage', 'reports_view'],
        description: 'Production floor management access'
      },
      { 
        id: '6', 
        name: 'Delivery Coordinator',
        accessCount: 67,
        permissions: ['dashboard', 'delivery_view', 'delivery_manage', 'orders_view'],
        description: 'Delivery and logistics access'
      },
    ],
  });

  const addRoleMutation = useMutation({
    mutationFn: async (roleData: typeof newRole) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return roleData;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      setIsAddDialogOpen(false);
      setNewRole({ name: '', permissions: [] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return roleId;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
    },
  });

  const togglePermission = (permissionId: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const filteredRoles = roles.filter(role => 
    role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-all-roles">
              All Roles
            </h1>
            <p className="text-gray-600">Manage user roles and permissions for the platform</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Role Management</span>
                </CardTitle>
                <CardDescription>Define access levels for different user types</CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-role">
                    <Plus className="h-4 w-4 mr-2" />
                    Add new
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Role</DialogTitle>
                    <DialogDescription>Define a new role with specific permissions</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="role-name">Role Name</Label>
                      <Input
                        id="role-name"
                        value={newRole.name}
                        onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                        placeholder="Enter role name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto border rounded-lg p-4">
                        {allPermissions.map((permission) => (
                          <div key={permission.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={newRole.permissions.includes(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <Label htmlFor={permission.id} className="text-sm font-normal">
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={() => addRoleMutation.mutate(newRole)} 
                      disabled={addRoleMutation.isPending || !newRole.name}
                    >
                      {addRoleMutation.isPending ? 'Creating...' : 'Create Role'}
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
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-500">entries</span>
              </div>
              
              <div className="flex-1" />
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-roles"
                />
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role, index) => (
                  <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{role.name}</div>
                        {role.description && (
                          <div className="text-sm text-gray-500">{role.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-600">{role.accessCount}</span>
                      <span className="text-sm text-gray-400 ml-1">permission{role.accessCount !== 1 ? 's' : ''}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingRole(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteRoleMutation.mutate(role.id)}
                          disabled={role.name === 'Federation Admin'}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredRoles.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No roles found</p>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing 1 to {filteredRoles.length} of {roles.length} entries
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button size="sm" className="bg-blue-500">1</Button>
                <Button variant="outline" size="sm">Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
