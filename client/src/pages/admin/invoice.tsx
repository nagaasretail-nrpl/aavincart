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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Eye, Download, Send, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface Invoice {
  id: string;
  merchantId: string;
  planId: string;
  invoiceReference: string;
  amount: string;
  totalAmount: string;
  tax: string;
  status: string;
  paymentMethod: string;
  dueDate: Date;
  paymentDate: Date | null;
  createdAt: Date;
}

export default function InvoiceManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: invoices = [], isLoading, error } = useQuery<Invoice[]>({
    queryKey: ['/api/admin/invoices'],
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      const response = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create invoice');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const handleCreateInvoice = (formData: FormData) => {
    const invoiceData = {
      merchantId: formData.get('merchantId') as string,
      planId: formData.get('planId') as string,
      amount: formData.get('amount') as string,
      tax: formData.get('tax') as string,
      totalAmount: (parseFloat(formData.get('amount') as string) + parseFloat(formData.get('tax') as string)).toString(),
      dueDate: new Date(formData.get('dueDate') as string),
      status: 'unpaid',
    };
    
    createInvoiceMutation.mutate(invoiceData);
  };

  const filteredInvoices = invoices.filter((invoice: Invoice) =>
    invoice.invoiceReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.merchantId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { variant: 'default' as const, color: 'text-green-600' },
      unpaid: { variant: 'destructive' as const, color: 'text-red-600' },
      overdue: { variant: 'destructive' as const, color: 'text-red-600' },
      pending: { variant: 'secondary' as const, color: 'text-yellow-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{status}</Badge>;
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
        <p className="text-red-600">Failed to load invoices</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] })}>
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
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-invoices">
            Sales Invoices
          </h1>
          <p className="text-gray-600">Manage subscription invoices and billing</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-invoice">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateInvoice(new FormData(e.target as HTMLFormElement));
            }} className="space-y-4">
              <Input
                name="merchantId"
                placeholder="Union ID"
                required
                data-testid="input-merchant-id"
              />
              <Input
                name="planId"
                placeholder="Plan ID"
                required
                data-testid="input-plan-id"
              />
              <Input
                name="amount"
                type="number"
                step="0.01"
                placeholder="Amount"
                required
                data-testid="input-amount"
              />
              <Input
                name="tax"
                type="number"
                step="0.01"
                placeholder="Tax"
                required
                data-testid="input-tax"
              />
              <Input
                name="dueDate"
                type="date"
                placeholder="Due Date"
                required
                data-testid="input-due-date"
              />
              <Button type="submit" className="w-full" data-testid="button-submit-invoice">
                Create Invoice
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Invoices</CardTitle>
          <CardDescription>Find invoices by reference number or merchant ID</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-invoices"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
          <CardDescription>All subscription invoices in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Union</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice: Invoice) => (
                <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-reference-${invoice.id}`}>
                      {invoice.invoiceReference}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-merchant-${invoice.id}`}>
                    {invoice.merchantId}
                  </TableCell>
                  <TableCell data-testid={`text-plan-${invoice.id}`}>
                    {invoice.planId}
                  </TableCell>
                  <TableCell data-testid={`text-amount-${invoice.id}`}>
                    ₹{invoice.amount}
                  </TableCell>
                  <TableCell data-testid={`text-tax-${invoice.id}`}>
                    ₹{invoice.tax}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-total-${invoice.id}`}>
                      ₹{invoice.totalAmount}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`status-${invoice.id}`}>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell data-testid={`text-due-date-${invoice.id}`}>
                    {formatTimestamp(invoice.dueDate)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-${invoice.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-download-${invoice.id}`}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-send-${invoice.id}`}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredInvoices.length === 0 && (
            <div className="text-center py-8" data-testid="no-invoices-message">
              <p className="text-gray-500">
                {searchQuery ? 'No invoices found matching your search.' : 'No invoices found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}