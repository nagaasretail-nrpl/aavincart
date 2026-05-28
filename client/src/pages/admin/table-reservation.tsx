import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Calendar, Clock, Users, Check, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface Reservation {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  merchantId: string;
  clientId: string;
  reservationDate: Date;
  reservationTime: string;
  partySize: number;
  tableNumber: string | null;
  specialRequests: string | null;
  status: string;
  createdAt: Date;
}

export default function TableReservationManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  const { data: reservations = [], isLoading, error } = useQuery<Reservation[]>({
    queryKey: ['/api/admin/reservations'],
  });

  const updateReservationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/admin/reservations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update reservation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/reservations'] });
      toast({
        title: "Success",
        description: "Reservation updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update reservation",
        variant: "destructive",
      });
    },
  });

  const filteredReservations = reservations.filter((reservation: Reservation) => {
    const matchesSearch = reservation.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         reservation.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         reservation.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, color: 'text-yellow-600' },
      confirmed: { variant: 'default' as const, color: 'text-blue-600' },
      seated: { variant: 'default' as const, color: 'text-green-600' },
      completed: { variant: 'default' as const, color: 'text-green-600' },
      cancelled: { variant: 'destructive' as const, color: 'text-red-600' },
      no_show: { variant: 'destructive' as const, color: 'text-red-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{status.replace('_', ' ')}</Badge>;
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
        <p className="text-red-600">Failed to load reservations</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/reservations'] })}>
          Retry
        </Button>
      </div>
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
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-reservations">
            Table Reservations
          </h1>
          <p className="text-gray-600">Manage union table reservations and bookings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find reservations by customer details or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search reservations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-reservations"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="seated">Seated</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reservations ({filteredReservations.length})</CardTitle>
          <CardDescription>All table reservations in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Party Size</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Special Requests</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((reservation: Reservation) => (
                <TableRow key={reservation.id} data-testid={`row-reservation-${reservation.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-customer-name-${reservation.id}`}>
                      {reservation.customerName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm" data-testid={`text-email-${reservation.id}`}>
                        {reservation.customerEmail}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-phone-${reservation.id}`}>
                        {reservation.customerPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium" data-testid={`text-date-${reservation.id}`}>
                          {new Date(reservation.reservationDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span data-testid={`text-time-${reservation.id}`}>
                            {reservation.reservationTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="font-medium" data-testid={`text-party-size-${reservation.id}`}>
                        {reservation.partySize}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-table-${reservation.id}`}>
                    {reservation.tableNumber || 'Not assigned'}
                  </TableCell>
                  <TableCell data-testid={`status-${reservation.id}`}>
                    {getStatusBadge(reservation.status)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm" data-testid={`text-requests-${reservation.id}`}>
                      {reservation.specialRequests || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {reservation.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateReservationMutation.mutate({ id: reservation.id, status: 'confirmed' })}
                            data-testid={`button-confirm-${reservation.id}`}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => updateReservationMutation.mutate({ id: reservation.id, status: 'cancelled' })}
                            data-testid={`button-cancel-${reservation.id}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {reservation.status === 'confirmed' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateReservationMutation.mutate({ id: reservation.id, status: 'seated' })}
                          data-testid={`button-seat-${reservation.id}`}
                        >
                          Seat
                        </Button>
                      )}
                      {reservation.status === 'seated' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateReservationMutation.mutate({ id: reservation.id, status: 'completed' })}
                          data-testid={`button-complete-${reservation.id}`}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredReservations.length === 0 && (
            <div className="text-center py-8" data-testid="no-reservations-message">
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all' ? 'No reservations found matching your criteria.' : 'No reservations found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}