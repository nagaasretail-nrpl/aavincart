import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, CheckCircle, XCircle, ArrowLeft, Building, Loader2, Clock } from 'lucide-react';

interface B2BUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  businessType: string;
  businessCode: string;
  gstNumber: string;
  status: string;
  unionId: string;
  createdAt: string;
  businessName?: string;
  businessAddress?: string;
  district?: string;
  rejectionReason?: string;
}

export default function UnionB2BApprovals() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<B2BUser | null>(null);
  const [actionUser, setActionUser] = useState<B2BUser | null>(null);
  const [actionType, setActionType] = useState<'approved' | 'rejected'>('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<B2BUser[]>({
    queryKey: ['/api/merchant/b2b-users'],
    queryFn: async () => {
      const res = await fetch('/api/merchant/b2b-users', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch B2B users');
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      const res = await apiRequest('PATCH', `/api/merchant/b2b-users/${id}/approve`, {
        status,
        rejectionReason,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/merchant/b2b-users'] });
      toast({
        title: actionType === 'approved' ? 'User Approved' : 'User Rejected',
        description: `${actionUser?.name} has been ${actionType}.`,
      });
      setActionUser(null);
      setRejectionReason('');
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Action failed', variant: 'destructive' });
    },
  });

  const filteredUsers = users.filter(user => {
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.phone?.includes(q) ||
      user.businessCode?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalCount = users.length;
  const pendingCount = users.filter(u => u.status === 'pending').length;
  const approvedCount = users.filter(u => u.status === 'approved' || u.status === 'active').length;
  const rejectedCount = users.filter(u => u.status === 'rejected').length;

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      pending: { className: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { className: 'bg-green-100 text-green-800', label: 'Approved' },
      active: { className: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { className: 'bg-red-100 text-red-800', label: 'Rejected' },
    };
    const c = config[status] || { className: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const openAction = (user: B2BUser, type: 'approved' | 'rejected') => {
    setActionUser(user);
    setActionType(type);
    setRejectionReason('');
  };

  const handleConfirmAction = () => {
    if (!actionUser) return;
    approveMutation.mutate({
      id: actionUser.id,
      status: actionType,
      rejectionReason: actionType === 'rejected' ? rejectionReason : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/union/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">B2B User Approvals</h1>
              <p className="text-sm text-gray-600">Review and manage B2B user registrations for your union</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
                <div className="text-xs text-gray-500">Total B2B Users</div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('pending')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
                <div className="text-xs text-gray-500">Pending Approvals</div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('approved')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{approvedCount}</div>
                <div className="text-xs text-gray-500">Approved</div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('rejected')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{rejectedCount}</div>
                <div className="text-xs text-gray-500">Rejected</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, phone, or business code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Building className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No B2B users found</p>
                <p className="text-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No B2B users have registered yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Business Type</TableHead>
                      <TableHead>Business Code</TableHead>
                      <TableHead>GST Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedUser(user)}
                      >
                        <TableCell className="font-medium">{user.name || '—'}</TableCell>
                        <TableCell>{user.email || '—'}</TableCell>
                        <TableCell>{user.phone || '—'}</TableCell>
                        <TableCell>{user.businessType || user.role || '—'}</TableCell>
                        <TableCell>{user.businessCode || '—'}</TableCell>
                        <TableCell>{user.gstNumber || '—'}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {(user.status === 'pending' || user.status === 'rejected') && (
                              <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => openAction(user, 'approved')}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {(user.status === 'pending' || user.status === 'approved' || user.status === 'active') && (
                              <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => openAction(user, 'rejected')}>
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            )}
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
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>B2B user registration details</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-500">Name</span>
                  <p className="font-medium">{selectedUser.name || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email</span>
                  <p className="font-medium">{selectedUser.email || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone</span>
                  <p className="font-medium">{selectedUser.phone || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Role</span>
                  <p className="font-medium">{selectedUser.role || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Business Type</span>
                  <p className="font-medium">{selectedUser.businessType || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Business Code</span>
                  <p className="font-medium">{selectedUser.businessCode || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Business Name</span>
                  <p className="font-medium">{selectedUser.businessName || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">GST Number</span>
                  <p className="font-medium">{selectedUser.gstNumber || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">District</span>
                  <p className="font-medium">{selectedUser.district || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-500">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                </div>
                {selectedUser.businessAddress && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Business Address</span>
                    <p className="font-medium">{selectedUser.businessAddress}</p>
                  </div>
                )}
                {selectedUser.rejectionReason && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Rejection Reason</span>
                    <p className="font-medium text-red-600">{selectedUser.rejectionReason}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Registered</span>
                  <p className="font-medium">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '—'}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                {(selectedUser.status === 'pending' || selectedUser.status === 'rejected') && (
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setSelectedUser(null); openAction(selectedUser, 'approved'); }}>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                )}
                {(selectedUser.status === 'pending' || selectedUser.status === 'approved' || selectedUser.status === 'active') && (
                  <Button size="sm" variant="destructive" onClick={() => { setSelectedUser(null); openAction(selectedUser, 'rejected'); }}>
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionUser} onOpenChange={(open) => { if (!open) { setActionUser(null); setRejectionReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === 'approved' ? 'Approve User' : 'Reject User'}</DialogTitle>
            <DialogDescription>
              {actionType === 'approved'
                ? `Are you sure you want to approve ${actionUser?.name}?`
                : `Are you sure you want to reject ${actionUser?.name}?`}
            </DialogDescription>
          </DialogHeader>
          {actionType === 'rejected' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Rejection Reason (optional)</label>
              <Textarea
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionUser(null); setRejectionReason(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={approveMutation.isPending}
              className={actionType === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
