import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminLayout from './layout';
import { queryClient } from '@/lib/queryClient';
import { formatTimestamp } from '@/lib/format-timestamp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Shield, User, Crown, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLogin: Date | null;
  createdAt: Date;
  permissions: string[];
}

export default function AccountManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Mock data - in real app this would come from the API
  const { data: users = [], isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      // Mock data for demonstration
      return [
        {
          id: '1',
          name: 'Super Admin',
          email: 'admin@foodiehub.com',
          role: 'super_admin',
          status: 'active',
          lastLogin: new Date(),
          createdAt: new Date('2024-01-01'),
          permissions: ['all']
        },
        {
          id: '2',
          name: 'John Manager',
          email: 'john@foodiehub.com',
          role: 'manager',
          status: 'active',
          lastLogin: new Date('2024-01-15'),
          createdAt: new Date('2024-01-10'),
          permissions: ['orders', 'merchants', 'earnings']
        }
      ];
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { ...userData, id: Date.now().toString(), createdAt: new Date() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Admin user created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (formData: FormData) => {
    const userData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as string,
      status: 'active',
      permissions: [],
    };
    
    createUserMutation.mutate(userData);
  };

  const filteredUsers = users.filter((user: AdminUser) => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      super_admin: { variant: 'default' as const, color: 'text-purple-600', icon: <Crown className="h-3 w-3" /> },
      admin: { variant: 'default' as const, color: 'text-blue-600', icon: <Shield className="h-3 w-3" /> },
      manager: { variant: 'secondary' as const, color: 'text-green-600', icon: <User className="h-3 w-3" /> },
      moderator: { variant: 'secondary' as const, color: 'text-orange-600', icon: <User className="h-3 w-3" /> },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.moderator;
    return (
      <div className="flex items-center space-x-1">
        {config.icon}
        <Badge variant={config.variant}>{role.replace('_', ' ')}</Badge>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load admin users</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-account">
            Account Management
          </h1>
          <p className="text-gray-600">Manage admin users and their permissions</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-user">
              <Plus className="h-4 w-4 mr-2" />
              Add Admin User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Admin User</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateUser(new FormData(e.target as HTMLFormElement));
            }} className="space-y-4">
              <Input
                name="name"
                placeholder="Full Name"
                required
                data-testid="input-name"
              />
              <Input
                name="email"
                type="email"
                placeholder="Email Address"
                required
                data-testid="input-email"
              />
              <Select name="role" required>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" className="w-full" data-testid="button-submit-user">
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find admin users by name, email, or role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-users"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40" data-testid="select-role-filter">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Users ({filteredUsers.length})</CardTitle>
          <CardDescription>All administrative users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user: AdminUser) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-name-${user.id}`}>
                      {user.name}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-email-${user.id}`}>
                    {user.email}
                  </TableCell>
                  <TableCell data-testid={`role-${user.id}`}>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell data-testid={`status-${user.id}`}>
                    <Badge 
                      variant={user.status === 'active' ? 'default' : 'secondary'}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-last-login-${user.id}`}>
                    {user.lastLogin ? formatTimestamp(user.lastLogin) : 'Never'}
                  </TableCell>
                  <TableCell data-testid={`text-created-${user.id}`}>
                    {formatTimestamp(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-edit-${user.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.role !== 'super_admin' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8" data-testid="no-users-message">
              <p className="text-gray-500">
                {searchQuery || roleFilter !== 'all' ? 'No users found matching your criteria.' : 'No admin users found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}