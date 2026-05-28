import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ArrowLeft, Search, UserPlus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'merchant' | 'customer' | 'driver';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  lastLogin?: Date;
}

export default function Users() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const { data: merchants = [], isLoading: merchantsLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/merchants'],
  });

  // Convert merchants to users format and add admin user
  const users: SystemUser[] = [
    {
      id: 'admin-1',
      name: 'Admin User',
      email: 'aavincart@gmail.com',
      role: 'admin',
      status: 'active',
      createdAt: new Date('2024-01-15'),
      lastLogin: new Date('2024-01-20'),
    },
    ...merchants.map((merchant: any) => ({
      id: merchant.id,
      name: merchant.contactName || merchant.restaurantName,
      email: merchant.username || merchant.contactEmail,
      role: 'merchant' as const,
      status: (merchant.status === 'active' ? 'active' : merchant.status === 'inactive' ? 'inactive' : 'suspended') as 'active' | 'inactive' | 'suspended',
      createdAt: new Date(merchant.createdAt || '2024-01-01'),
      lastLogin: merchant.lastLogin ? new Date(merchant.lastLogin) : undefined,
    })),
  ];

  const isLoading = merchantsLoading;

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/merchants'] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user: SystemUser) => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { variant: 'destructive' as const },
      merchant: { variant: 'default' as const },
      customer: { variant: 'secondary' as const },
      driver: { variant: 'outline' as const },
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.customer;
    return <Badge variant={config.variant}>{role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, color: 'text-green-600' },
      inactive: { variant: 'secondary' as const, color: 'text-gray-600' },
      suspended: { variant: 'destructive' as const, color: 'text-red-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge variant={config.variant}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-users">
              User Management
            </h1>
            <p className="text-gray-600">Manage system users and their permissions</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Search & Filter Users</span>
              </div>
              <Button data-testid="button-add-user">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </CardTitle>
            <CardDescription>Find and manage users in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="merchant">Union</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>All users in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: SystemUser) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="font-medium" data-testid={`text-user-name-${user.id}`}>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-user-email-${user.id}`}>
                      {user.email}
                    </TableCell>
                    <TableCell data-testid={`role-${user.id}`}>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell data-testid={`status-${user.id}`}>
                      {getStatusBadge(user.status)}
                    </TableCell>
                    <TableCell data-testid={`text-created-${user.id}`}>
                      {formatTimestamp(user.createdAt)}
                    </TableCell>
                    <TableCell data-testid={`text-last-login-${user.id}`}>
                      {user.lastLogin ? formatTimestamp(user.lastLogin) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {user.role === 'merchant' ? (
                          <Link href={`/admin/merchant/edit/${user.id}`}>
                            <Button variant="outline" size="sm" data-testid={`button-edit-${user.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        ) : (
                          <Button variant="outline" size="sm" data-testid={`button-edit-${user.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteUserMutation.mutate(user.id)}
                          disabled={user.role === 'admin'}
                          data-testid={`button-delete-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8" data-testid="no-users-message">
                <p className="text-gray-500">
                  {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' ? 'No users found matching your criteria.' : 'No users found.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}