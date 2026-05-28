import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, DollarSign, TrendingUp, TrendingDown, Users, Calendar, ArrowLeft, Receipt, RotateCcw, IndianRupee, CreditCard } from 'lucide-react';
import { Link } from 'wouter';

interface Earning {
  id: string;
  merchantId: string;
  orderId: string;
  commissionType: string;
  commissionRate: string;
  grossAmount: string;
  commissionAmount: string;
  netAmount: string;
  status: string;
  earnedAt: Date;
  paidAt: Date | null;
}

interface EarningsStats {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  totalOrders: number;
  averageCommission: number;
}

interface PnLSummary {
  grossSales: number;
  totalReturns: number;
  netSales: number;
  taxCollected: number;
  deliveryFees: number;
  ordersCount: number;
  avgOrderValue: number;
  subscriptionRevenue?: number;
}

export default function EarningsManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: earnings = [], isLoading, error } = useQuery<Earning[]>({
    queryKey: ['/api/admin/earnings'],
  });

  const { data: pnlSummary } = useQuery<PnLSummary>({
    queryKey: ['/api/admin/earnings/summary'],
  });

  const calculateStats = (): EarningsStats => {
    const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.commissionAmount || '0'), 0);
    const pendingEarnings = earnings
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + parseFloat(e.commissionAmount || '0'), 0);
    const paidEarnings = earnings
      .filter(e => e.status === 'paid')
      .reduce((sum, e) => sum + parseFloat(e.commissionAmount || '0'), 0);
    const totalOrders = earnings.length;
    const averageCommission = totalOrders > 0 ? totalEarnings / totalOrders : 0;

    return {
      totalEarnings,
      pendingEarnings,
      paidEarnings,
      totalOrders,
      averageCommission,
    };
  };

  const stats = calculateStats();

  const filteredEarnings = earnings.filter((earning: Earning) =>
    earning.merchantId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    earning.orderId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <p className="text-red-600">Failed to load earnings</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/earnings'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-earnings">
          Earnings Management
        </h1>
        <p className="text-gray-600">Track commission earnings and payouts</p>
      </div>

      {pnlSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Gross Sales</CardTitle>
              <IndianRupee className="h-4 w-4 text-blue-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{pnlSummary.grossSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-blue-100">{pnlSummary.ordersCount} orders</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-100">Returns</CardTitle>
              <RotateCcw className="h-4 w-4 text-red-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{pnlSummary.totalReturns.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-red-100">Credit notes issued</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Net Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{pnlSummary.netSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-green-100">Gross - Returns</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Tax Collected</CardTitle>
              <Receipt className="h-4 w-4 text-purple-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{pnlSummary.taxCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-purple-100">GST collected</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-100">Subscription Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-amber-200" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(pnlSummary.subscriptionRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <p className="text-xs text-amber-100">Membership plans</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-total-earnings">
              ₹{stats.totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Commission earnings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-pending-earnings">
              ₹{stats.pendingEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payout</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-paid-earnings">
              ₹{stats.paidEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Already paid</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stats-total-orders">
              {stats.totalOrders}
            </div>
            <p className="text-xs text-muted-foreground">Earning orders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Earnings</CardTitle>
          <CardDescription>Find earnings by union ID or order ID</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by union or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-earnings"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Earnings ({filteredEarnings.length})</CardTitle>
          <CardDescription>All commission earnings in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Union</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEarnings.map((earning: Earning) => (
                <TableRow key={earning.id} data-testid={`row-earning-${earning.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-order-id-${earning.id}`}>
                      #{earning.orderId}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-merchant-${earning.id}`}>
                    {earning.merchantId}
                  </TableCell>
                  <TableCell data-testid={`text-type-${earning.id}`}>
                    {earning.commissionType}
                  </TableCell>
                  <TableCell data-testid={`text-rate-${earning.id}`}>
                    {earning.commissionRate}%
                  </TableCell>
                  <TableCell data-testid={`text-gross-${earning.id}`}>
                    ${earning.grossAmount}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-600" data-testid={`text-commission-${earning.id}`}>
                      ${earning.commissionAmount}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-net-${earning.id}`}>
                    ${earning.netAmount}
                  </TableCell>
                  <TableCell data-testid={`status-${earning.id}`}>
                    <Badge 
                      variant={earning.status === 'paid' ? 'default' : 'secondary'}
                    >
                      {earning.status}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-earned-${earning.id}`}>
                    {formatTimestamp(earning.earnedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          
          {filteredEarnings.length === 0 && (
            <div className="text-center py-8" data-testid="no-earnings-message">
              <p className="text-gray-500">
                {searchQuery ? 'No earnings found matching your search.' : 'No earnings found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}