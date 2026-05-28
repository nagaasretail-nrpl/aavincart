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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit, Trash2, UserPlus, Shield, Eye, EyeOff } from "lucide-react";
import AdminLayout from "./layout";
import { ADMIN_PERMISSIONS } from "@shared/schema";

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

export default function AdminSubUsersPage() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SubUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    username: "",
    password: "",
    permissions: [] as string[],
  });

  const parentId = "admin-1";

  const { data: subUsers = [], isLoading } = useQuery<SubUser[]>({
    queryKey: ['/api/admin/sub-users', parentId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/sub-users?parentId=${parentId}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/admin/sub-users', { ...data, parentId });
      return response;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sub-user created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-users'] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create sub-user", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SubUser & { password?: string }> }) => {
      const response = await apiRequest('PUT', `/api/admin/sub-users/${id}`, data);
      return response;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Sub-user updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-users'] });
      setEditingUser(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update sub-user", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/admin/sub-users/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Sub-user has been removed" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sub-users'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete sub-user", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", username: "", password: "", permissions: [] });
    setShowPassword(false);
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sub-Users Management</h1>
            <p className="text-gray-500 mt-1">Create and manage delegated accounts with customizable permissions</p>
          </div>
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
                    {ADMIN_PERMISSIONS.map((perm) => (
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Sub-Users</CardTitle>
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
                <p>No sub-users yet. Create your first delegated account!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(user.permissions || []).slice(0, 3).map((p) => (
                            <Badge key={p} variant="secondary" className="text-xs">
                              {ADMIN_PERMISSIONS.find(ap => ap.key === p)?.label || p}
                            </Badge>
                          ))}
                          {(user.permissions || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.permissions.length - 3} more
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
                                    {ADMIN_PERMISSIONS.map((perm) => (
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
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
