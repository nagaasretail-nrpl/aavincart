import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import AdminLayout from "./layout";
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
import { Search, DollarSign, Clock, Check, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Payout {
  id: string;
  merchantId: string;
  requestedAmount: string;
  processedAmount: string;
  fees: string;
  netAmount: string;
  status: string;
  paymentMethod: string;
  requestDate: Date;
  processedDate: Date | null;
  notes: string | null;
  createdAt: Date;
}

export default function WithdrawalsManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const { data: withdrawals = [], isLoading, error } = useQuery<Payout[]>({
    queryKey: ['/api/admin/payouts'],
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status, processedAmount, notes }: { 
      id: string; 
      status: string; 
      processedAmount?: string;
      notes?: string;
    }) => {
      const response = await fetch(`/api/admin/payouts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status, 
          processedAmount,
          processedDate: new Date(),
          notes 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update withdrawal');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
      toast({
        title: "Success",
        description: "Withdrawal updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update withdrawal",
        variant: "destructive",
      });
    },
  });

  const filteredWithdrawals = withdrawals.filter((withdrawal: Payout) => {
    const matchesSearch = withdrawal.merchantId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         withdrawal.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, color: 'text-yellow-600' },
      processing: { variant: 'default' as const, color: 'text-blue-600' },
      completed: { variant: 'default' as const, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, color: 'text-red-600' },
      cancelled: { variant: 'destructive' as const, color: 'text-red-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{status}</Badge>;
  };

  const calculateStats = () => {
    const totalRequested = withdrawals.reduce((sum, w) => sum + parseFloat(w.requestedAmount || '0'), 0);
    const totalProcessed = withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + parseFloat(w.processedAmount || '0'), 0);
    const pendingAmount = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + parseFloat(w.requestedAmount || '0'), 0);
    const totalFees = withdrawals.reduce((sum, w) => sum + parseFloat(w.fees || '0'), 0);

    return { totalRequested, totalProcessed, pendingAmount, totalFees };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load withdrawals</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-withdrawals">
            Withdrawals Management
          </h1>
          <p className="text-gray-600">Process union withdrawal requests and payouts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-total-requested">
              ₹{stats.totalRequested.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All requests</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-pending">
              ₹{stats.pendingAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processed</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-processed">
              ₹{stats.totalProcessed.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Completed payouts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-fees">
              ₹{stats.totalFees.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Processing fees</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find withdrawals by union ID or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search withdrawals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-withdrawals"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests ({filteredWithdrawals.length})</CardTitle>
          <CardDescription>All union withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Union</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWithdrawals.map((withdrawal: Payout) => (
                <TableRow key={withdrawal.id} data-testid={`row-withdrawal-${withdrawal.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-id-${withdrawal.id}`}>
                      #{withdrawal.id.slice(0, 8)}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-merchant-${withdrawal.id}`}>
                    {withdrawal.merchantId}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-requested-${withdrawal.id}`}>
                      ${withdrawal.requestedAmount}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-fees-${withdrawal.id}`}>
                    ${withdrawal.fees}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-600" data-testid={`text-net-${withdrawal.id}`}>
                      ${withdrawal.netAmount}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-method-${withdrawal.id}`}>
                    {withdrawal.paymentMethod}
                  </TableCell>
                  <TableCell data-testid={`status-${withdrawal.id}`}>
                    {getStatusBadge(withdrawal.status)}
                  </TableCell>
                  <TableCell data-testid={`text-date-${withdrawal.id}`}>
                    {formatTimestamp(withdrawal.requestDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-${withdrawal.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {withdrawal.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateWithdrawalMutation.mutate({ 
                              id: withdrawal.id, 
                              status: 'completed',
                              processedAmount: withdrawal.requestedAmount,
                              notes: 'Approved and processed'
                            })}
                            data-testid={`button-approve-${withdrawal.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateWithdrawalMutation.mutate({ 
                              id: withdrawal.id, 
                              status: 'rejected',
                              notes: 'Request rejected'
                            })}
                            data-testid={`button-reject-${withdrawal.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredWithdrawals.length === 0 && (
            <div className="text-center py-8" data-testid="no-withdrawals-message">
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all' ? 'No withdrawals found matching your criteria.' : 'No withdrawal requests found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}