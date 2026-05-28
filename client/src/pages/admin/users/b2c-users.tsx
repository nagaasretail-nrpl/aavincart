import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatTimestamp } from '@/lib/format-timestamp';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Users, ArrowLeft, Search, Download, Upload, Plus, Key, LogIn, Copy, Check, Loader2, Eye, EyeOff, CheckCircle, XCircle, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import AdminLayout from '../layout';
import { downloadSampleExcel, SAMPLE_EXCEL_CONFIGS, parseXlsxToRows } from '@/lib/excel-utils';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function B2CUsers() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [credUser, setCredUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [autoLoginLoading, setAutoLoginLoading] = useState<string | null>(null);
  const [autoLoginUrl, setAutoLoginUrl] = useState('');
  const [autoLoginUser, setAutoLoginUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '' });
  const [addingUser, setAddingUser] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users', 'b2c'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users?type=b2c', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      active: { className: 'bg-green-100 text-green-800', label: 'Active' },
      approved: { className: 'bg-green-100 text-green-800', label: 'Approved' },
      inactive: { className: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      rejected: { className: 'bg-red-100 text-red-800', label: 'Rejected' },
    };
    const c = config[status] || config.active;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleResetPassword = async () => {
    if (!credUser || !newPassword.trim()) return;
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setResettingPassword(true);
    try {
      await apiRequest('POST', `/api/admin/users/${credUser.id}/reset-password`, { newPassword });
      toast({ title: 'Password Updated', description: `Password has been set for ${credUser.name}` });
      setNewPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to reset password', variant: 'destructive' });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleAutoLogin = async (user: User) => {
    setAutoLoginLoading(user.id);
    try {
      const res = await apiRequest('POST', `/api/admin/users/${user.id}/auto-login`);
      const data = await res.json();
      const url = `${window.location.origin}/api/auto-login/${data.token}`;
      setAutoLoginUrl(url);
      setAutoLoginUser(user);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate auto-login link', variant: 'destructive' });
    } finally {
      setAutoLoginLoading(null);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(autoLoginUrl);
    setCopied(true);
    toast({ title: 'Copied', description: 'Auto-login URL copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInNewTab = () => {
    window.open(autoLoginUrl, '_blank');
  };

  const handleApproveUser = async (user: User) => {
    try {
      await apiRequest('PATCH', `/api/admin/users/${user.id}/approve`, { action: 'approve' });
      toast({ title: 'User Approved', description: `${user.name} can now log in` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', 'b2c'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to approve user', variant: 'destructive' });
    }
  };

  const handleRejectUser = async (user: User) => {
    try {
      await apiRequest('PATCH', `/api/admin/users/${user.id}/approve`, { action: 'reject' });
      toast({ title: 'User Rejected', description: `${user.name} has been rejected` });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', 'b2c'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to reject user', variant: 'destructive' });
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.phone.trim()) {
      toast({ title: 'Error', description: 'Name and Phone are required', variant: 'destructive' });
      return;
    }
    if (newUser.password && newUser.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setAddingUser(true);
    try {
      await apiRequest('POST', '/api/admin/users', {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        password: newUser.password || undefined,
        role: 'consumer',
        pricingTier: 'mrp',
      });
      toast({ title: 'User Created', description: `${newUser.name} has been added as a B2C consumer` });
      setIsAddDialogOpen(false);
      setNewUser({ name: '', email: '', phone: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', 'b2c'] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create user', variant: 'destructive' });
    } finally {
      setAddingUser(false);
    }
  };

  const B2C_HEADER_MAP: Record<string, string> = {
    'full name': 'name', 'full name *': 'name', 'name': 'name',
    'email': 'email', 'email *': 'email',
    'phone': 'phone', 'phone *': 'phone', 'mobile': 'phone',
    'address': 'address',
    'city': 'city',
    'district': 'district',
    'pincode': 'pincode',
    'status': 'status',
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
        if (B2C_HEADER_MAP[normalized]) {
          colMap[h] = B2C_HEADER_MAP[normalized];
        } else {
          for (const [pattern, field] of Object.entries(B2C_HEADER_MAP)) {
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
        obj.role = 'consumer';
        obj.pricingTier = 'mrp';
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
        queryClient.invalidateQueries({ queryKey: ['/api/admin/users', 'b2c'] });
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

  const pendingCount = users.filter(u => u.status === 'pending').length;
  const activeCount = users.filter(u => u.status === 'active' || u.status === 'approved').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">B2C Users</h1>
              <p className="text-gray-600">Manage retail consumers who buy at MRP</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-blue-100 text-blue-700">{users.length} total</Badge>
            <Badge className="bg-green-100 text-green-700">{activeCount} active</Badge>
            {pendingCount > 0 && <Badge className="bg-yellow-100 text-yellow-700">{pendingCount} pending</Badge>}
            <Button variant="outline" size="sm" onClick={() => downloadSampleExcel(SAMPLE_EXCEL_CONFIGS.b2cUsers)}>
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
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={parsing}>
              {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import Excel
            </Button>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add new
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Consumer Users</span>
            </CardTitle>
            <CardDescription>Manage credentials, approve users, and auto-login as any consumer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No B2C users found</p>
                <p className="text-sm">Consumer users will appear here once they register</p>
              </div>
            ) : (
              <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                {getInitials(user.name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{user.email}</TableCell>
                        <TableCell className="text-gray-600">{user.phone || '-'}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-gray-600">
                          {formatTimestamp(user.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Set/Reset Password"
                              onClick={() => { setCredUser(user); setNewPassword(''); setShowPassword(false); }}>
                              <Key className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Auto-login as this user"
                              disabled={autoLoginLoading === user.id}
                              onClick={() => handleAutoLogin(user)}>
                              {autoLoginLoading === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
                            </Button>
                            {user.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" title="Approve user"
                                  onClick={() => handleApproveUser(user)}>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" title="Reject user"
                                  onClick={() => handleRejectUser(user)}>
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                          {getInitials(user.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      {getStatusBadge(user.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-400">Phone:</span> {user.phone || '-'}</div>
                      <div><span className="text-gray-400">Joined:</span> {formatTimestamp(user.createdAt)}</div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { setCredUser(user); setNewPassword(''); setShowPassword(false); }}>
                        <Key className="h-3 w-3 mr-1" /> Password
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" disabled={autoLoginLoading === user.id}
                        onClick={() => handleAutoLogin(user)}>
                        {autoLoginLoading === user.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <LogIn className="h-3 w-3 mr-1" />}
                        Login As
                      </Button>
                      {user.status === 'pending' && (
                        <>
                          <Button variant="outline" size="sm" className="text-green-600" onClick={() => handleApproveUser(user)}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleRejectUser(user)}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              </>
            )}

            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredUsers.length} of {users.length} B2C users
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!credUser} onOpenChange={(open) => { if (!open) { setCredUser(null); setNewPassword(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Credentials</DialogTitle>
            <DialogDescription>Manage login credentials for {credUser?.name}</DialogDescription>
          </DialogHeader>
          {credUser && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Login Email:</span>
                  <span className="font-mono">{credUser.email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Phone:</span>
                  <span className="font-mono">{credUser.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Status:</span>
                  {getStatusBadge(credUser.status)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Create / Reset Password</Label>
                <p className="text-xs text-gray-500">Set a new password for this user. They can use this password to log in.</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Enter new password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      className="pr-10"
                    />
                    <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Button onClick={handleResetPassword} disabled={resettingPassword || !newPassword.trim() || newPassword.length < 6}>
                    {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set'}
                  </Button>
                </div>
                {newPassword.length > 0 && newPassword.length < 6 && (
                  <p className="text-xs text-red-500">Password must be at least 6 characters</p>
                )}
              </div>
              <div className="border-t pt-4 space-y-2">
                <Label className="text-sm font-medium">Quick Auto-Login</Label>
                <p className="text-xs text-gray-500">Generate a one-click login link to access this user's account directly.</p>
                <Button variant="outline" className="w-full" onClick={() => handleAutoLogin(credUser)}
                  disabled={autoLoginLoading === credUser.id}>
                  {autoLoginLoading === credUser.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                  ) : (
                    <><LogIn className="h-4 w-4 mr-2" /> Login as {credUser.name}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!autoLoginUser} onOpenChange={(open) => { if (!open) { setAutoLoginUser(null); setAutoLoginUrl(''); setCopied(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Auto-Login Link</DialogTitle>
            <DialogDescription>One-click login link for {autoLoginUser?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-mono break-all select-all">{autoLoginUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={handleCopyUrl}>
                {copied ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy URL</>}
              </Button>
              <Button className="flex-1" onClick={handleOpenInNewTab}>
                <LogIn className="h-4 w-4 mr-2" /> Open in New Tab
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center">This link will log you in as this user in a new browser tab</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add B2C Consumer</DialogTitle>
            <DialogDescription>Create a new retail consumer account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="b2c-name">Full Name *</Label>
              <Input
                id="b2c-name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b2c-email">Email</Label>
              <Input
                id="b2c-email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b2c-phone">Phone *</Label>
              <Input
                id="b2c-phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="Enter 10-digit phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="b2c-password">Password</Label>
              <div className="relative">
                <Input
                  id="b2c-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Min 6 characters (optional)"
                  className="pr-10"
                />
                <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {newUser.password.length > 0 && newUser.password.length < 6 && (
                <p className="text-xs text-red-500">Password must be at least 6 characters</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} disabled={addingUser || !newUser.name.trim() || !newUser.phone.trim()}>
              {addingUser ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : 'Add Consumer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadDialog} onOpenChange={(open) => { if (!open) { setShowUploadDialog(false); setParsedRows([]); setImportResult(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import B2C Users Preview
            </DialogTitle>
            <DialogDescription>
              {parsedRows.length} rows parsed from Excel. Review before importing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {importResult ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  {(importResult.created > 0 || importResult.updated > 0) && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">Created: {importResult.created || 0}, Updated: {importResult.updated || 0}</span>
                    </div>
                  )}
                  {importResult.errors?.length > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{importResult.errors.length} errors</span>
                    </div>
                  )}
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {importResult.errors.map((err: any, i: number) => (
                      <p key={i} className="text-xs text-red-700">{typeof err === 'string' ? err : JSON.stringify(err)}</p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-x-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 20).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs">{i + 1}</TableCell>
                          <TableCell className="text-xs">{row.name || '-'}</TableCell>
                          <TableCell className="text-xs">{row.email || '-'}</TableCell>
                          <TableCell className="text-xs">{row.phone || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedRows.length > 20 && (
                  <p className="text-xs text-gray-500">... and {parsedRows.length - 20} more rows</p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); setParsedRows([]); setImportResult(null); }}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
            {!importResult && (
              <Button onClick={handleImport} disabled={importing || parsedRows.length === 0}>
                {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</> : `Import ${parsedRows.length} Users`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
