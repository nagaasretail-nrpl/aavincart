import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, UserPlus, Shield, Eye, EyeOff, Key, Users, UserCog } from "lucide-react";
import { MERCHANT_PERMISSIONS } from "@shared/schema";
import { useLocation } from "wouter";

interface SubUser {
  id: string;
  parentType: string;
  parentId: string;
  name: string;
  email: string;
  phone?: string;
  username: string;
  isActive: boolean;
  permissions: string[];
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface MappedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  pricingRole: string;
  role: string;
}

const SUB_USER_ROLES = [
  { value: 'manager', label: 'Manager', description: 'Full access to operations' },
  { value: 'cashier', label: 'Cashier', description: 'POS and payment operations' },
  { value: 'delivery', label: 'Delivery Team', description: 'Order delivery management' },
  { value: 'inventory', label: 'Inventory Staff', description: 'Stock management' },
  { value: 'reports', label: 'Reports Viewer', description: 'View-only access to reports' },
];

export default function MerchantSubUsersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SubUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<MappedUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("manager");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    permissions: [] as string[],
  });

  const urlParams = new URLSearchParams(window.location.search);
  const merchantId = urlParams.get('merchant') || 'merchant-3';

  const { data: subUsers = [], isLoading } = useQuery<SubUser[]>({
    queryKey: ['/api/merchant/sub-users', merchantId],
    queryFn: async () => {
      const response = await fetch(`/api/merchant/${merchantId}/sub-users`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const { data: mappedUsers = [], isLoading: isLoadingMapped } = useQuery<MappedUser[]>({
    queryKey: ['/api/merchant/mapped-users', merchantId],
    queryFn: async () => {
      const response = await fetch(`/api/merchant/${merchantId}/mapped-users`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', `/api/merchant/${merchantId}/sub-users`, data);
      return response;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sub-user created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sub-users'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create sub-user", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubUser & { password?: string }> }) => {
      const response = await apiRequest('PUT', `/api/merchant/${merchantId}/sub-users/${id}`, data);
      return response;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sub-user updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sub-users'] });
      setEditingUser(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update sub-user", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/merchant/${merchantId}/sub-users/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Sub-user has been removed" });
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/sub-users'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete sub-user", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const response = await apiRequest('POST', `/api/merchant/${merchantId}/reset-user-password`, { userId, password });
      return response;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password reset successfully" });
      setResetPasswordUser(null);
      setNewPassword("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reset password", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", username: "", password: "", permissions: [] });
    setShowPassword(false);
    setSelectedRole("manager");
  };

  const handleToggleActive = (user: SubUser) => {
    updateMutation.mutate({ id: user.id, data: { isActive: !user.isActive } });
  };

  const handlePermissionToggle = (permKey: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter(p => p !== permKey)
        : [...prev.permissions, permKey],
    }));
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    let permissions: string[] = [];
    switch (role) {
      case 'manager':
        permissions = MERCHANT_PERMISSIONS.map(p => p.key);
        break;
      case 'cashier':
        permissions = ['dashboard', 'orders_view', 'orders_manage'];
        break;
      case 'delivery':
        permissions = ['dashboard', 'orders_view', 'orders_manage'];
        break;
      case 'inventory':
        permissions = ['dashboard', 'products_view', 'inventory'];
        break;
      case 'reports':
        permissions = ['dashboard', 'reports_view'];
        break;
    }
    setFormData(prev => ({ ...prev, permissions }));
  };

  const handleEditClick = (user: SubUser) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      username: user.username,
      password: "",
      permissions: user.permissions || [],
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.username) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    if (!editingUser && !formData.password) {
      toast({ title: "Error", description: "Password is required for new users", variant: "destructive" });
      return;
    }
    if (editingUser) {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        permissions: formData.permissions,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getPricingRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      'DEALER': 'bg-blue-100 text-blue-800',
      'WHOLESALE_DEALER': 'bg-purple-100 text-purple-800',
      'RETAILER': 'bg-green-100 text-green-800',
      'MRP': 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 mt-1">Manage sub-users and reset passwords for mapped users</p>
          </div>
          <Button variant="outline" onClick={() => setLocation(`/merchant/dashboard?auto_login=${merchantId}`)}>
            Back to Dashboard
          </Button>
        </div>

        <Tabs defaultValue="subusers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="subusers" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Sub-Users
            </TabsTrigger>
            <TabsTrigger value="mapped" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mapped Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subusers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Sub-Users (Staff Accounts)
                </CardTitle>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={resetForm}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Sub-User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Sub-User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Role Template</Label>
                        <Select value={selectedRole} onValueChange={handleRoleSelect}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUB_USER_ROLES.map(role => (
                              <SelectItem key={role.value} value={role.value}>
                                <div className="flex flex-col">
                                  <span>{role.label}</span>
                                  <span className="text-xs text-gray-500">{role.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Full Name *</Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter full name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="email@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="9843777277"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Username *</Label>
                          <Input
                            value={formData.username}
                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Enter username"
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Password *</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={formData.password}
                              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                              placeholder="Enter password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Permissions
                        </Label>
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                          {MERCHANT_PERMISSIONS.map((perm) => (
                            <div key={perm.key} className="flex items-start space-x-3">
                              <Checkbox
                                id={perm.key}
                                checked={formData.permissions.includes(perm.key)}
                                onCheckedChange={() => handlePermissionToggle(perm.key)}
                              />
                              <div className="grid gap-0.5 leading-none">
                                <label htmlFor={perm.key} className="text-sm font-medium cursor-pointer">
                                  {perm.label}
                                </label>
                                <p className="text-xs text-gray-500">{perm.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                          {createMutation.isPending ? "Creating..." : "Create Sub-User"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading sub-users...</p>
                  </div>
                ) : subUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No sub-users yet. Create staff accounts for your team!</p>
                    <p className="text-sm mt-2">Sub-users can login at /merchant/login with their username and password.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Permissions</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(user.permissions || []).slice(0, 2).map((p) => (
                                  <Badge key={p} variant="secondary" className="text-xs">
                                    {MERCHANT_PERMISSIONS.find(mp => mp.key === p)?.label || p}
                                  </Badge>
                                ))}
                                {(user.permissions || []).length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{user.permissions.length - 2}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={user.isActive}
                                onCheckedChange={() => handleToggleActive(user)}
                                className="data-[state=checked]:bg-green-500"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Edit Sub-User: {user.name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Full Name *</Label>
                                          <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Email *</Label>
                                          <Input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Phone</Label>
                                          <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>New Password (leave blank to keep current)</Label>
                                          <Input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Enter new password"
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <Label className="flex items-center gap-2">
                                          <Shield className="h-4 w-4" />
                                          Permissions
                                        </Label>
                                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
                                          {MERCHANT_PERMISSIONS.map((perm) => (
                                            <div key={perm.key} className="flex items-start space-x-3">
                                              <Checkbox
                                                id={`edit-${perm.key}`}
                                                checked={formData.permissions.includes(perm.key)}
                                                onCheckedChange={() => handlePermissionToggle(perm.key)}
                                              />
                                              <div className="grid gap-0.5 leading-none">
                                                <label htmlFor={`edit-${perm.key}`} className="text-sm font-medium cursor-pointer">
                                                  {perm.label}
                                                </label>
                                                <p className="text-xs text-gray-500">{perm.description}</p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="flex justify-end gap-3 pt-4">
                                        <Button variant="outline" onClick={() => setEditingUser(null)}>
                                          Cancel
                                        </Button>
                                        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
                                          {updateMutation.isPending ? "Saving..." : "Save Changes"}
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this sub-user?")) {
                                      deleteMutation.mutate(user.id);
                                    }
                                  }}
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapped" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Mapped Users (Agents, Dealers, Retailers)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingMapped ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading mapped users...</p>
                  </div>
                ) : mappedUsers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No mapped users found for this Union.</p>
                    <p className="text-sm mt-2">Users with your Union ID will appear here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Pricing Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappedUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.phone || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getPricingRoleBadge(user.pricingRole)}>
                                {user.pricingRole}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResetPasswordUser(user)}
                              >
                                <Key className="h-4 w-4 mr-2" />
                                Reset Password
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password for {resetPasswordUser?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  You are about to reset the password for <strong>{resetPasswordUser?.email}</strong>.
                  The user will need to use the new password to login.
                </p>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setResetPasswordUser(null); setNewPassword(""); }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (resetPasswordUser && newPassword) {
                      resetPasswordMutation.mutate({ userId: resetPasswordUser.id, password: newPassword });
                    }
                  }}
                  disabled={!newPassword || resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
