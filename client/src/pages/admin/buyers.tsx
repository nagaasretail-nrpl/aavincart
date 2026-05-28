import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from './layout';
import { queryClient } from '@/lib/queryClient';
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
import { Search, Eye, Ban, UserCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

interface Client {
  id: string;
  clientUuid: string;
  firstName: string;
  lastName: string;
  contactPhone: string;
  contactEmail: string;
  status: string;
  lastLogin: Date | null;
  dateCreated: Date;
  totalOrders: number;
  totalSpent: string;
}

export default function BuyersManagement() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: buyers = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ['/api/admin/clients'],
  });

  const filteredBuyers = buyers.filter((buyer: Client) =>
    buyer.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    buyer.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    buyer.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <p className="text-red-600">Failed to load buyers</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/clients'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-buyers">
          Buyers Management
        </h1>
        <p className="text-gray-600">Manage customer accounts and their activity</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Buyers</CardTitle>
          <CardDescription>Find customers by name or email</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search buyers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-buyers"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customers ({filteredBuyers.length})</CardTitle>
          <CardDescription>All registered customers in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBuyers.map((buyer: Client) => (
                <TableRow key={buyer.id} data-testid={`row-buyer-${buyer.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium" data-testid={`text-name-${buyer.id}`}>
                        {buyer.firstName} {buyer.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {buyer.clientUuid}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium" data-testid={`text-email-${buyer.id}`}>
                        {buyer.contactEmail}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-phone-${buyer.id}`}>
                        {buyer.contactPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`status-${buyer.id}`}>
                    <Badge 
                      variant={buyer.status === 'active' ? 'default' : 'secondary'}
                    >
                      {buyer.status}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-orders-${buyer.id}`}>
                    {buyer.totalOrders || 0}
                  </TableCell>
                  <TableCell data-testid={`text-spent-${buyer.id}`}>
                    ₹{buyer.totalSpent || '0.00'}
                  </TableCell>
                  <TableCell data-testid={`text-last-login-${buyer.id}`}>
                    {buyer.lastLogin ? new Date(buyer.lastLogin).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell data-testid={`text-joined-${buyer.id}`}>
                    {new Date(buyer.dateCreated).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-${buyer.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-status-${buyer.id}`}>
                        {buyer.status === 'active' ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredBuyers.length === 0 && (
            <div className="text-center py-8" data-testid="no-buyers-message">
              <p className="text-gray-500">
                {searchQuery ? 'No buyers found matching your search.' : 'No buyers found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}