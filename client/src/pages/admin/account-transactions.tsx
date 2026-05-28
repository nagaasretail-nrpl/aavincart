import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import AdminLayout from './layout';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Transaction {
  id: string;
  date: Date;
  transaction: string;
  debitCredit: string;
  runningBalance: string;
}

export default function AccountTransactions() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/admin/account/transactions'],
    queryFn: async () => {
      return [
        { id: '1', date: new Date('2026-01-27T17:12:00'), transaction: 'Service Fee from Order #20703', debitCredit: '$1.00', runningBalance: '$1857.95' },
        { id: '2', date: new Date('2026-01-27T17:12:00'), transaction: 'Commission on order #20703', debitCredit: '$3.15', runningBalance: '$1856.95' },
        { id: '3', date: new Date('2026-01-27T19:23:00'), transaction: 'Commission on order #20701', debitCredit: '$2.65', runningBalance: '$1853.80' },
        { id: '4', date: new Date('2026-01-27T14:49:00'), transaction: 'Service Fee from Order #20700', debitCredit: '$2.00', runningBalance: '$1851.15' },
        { id: '5', date: new Date('2026-01-27T14:49:00'), transaction: 'Commission on order #20700', debitCredit: '$5.95', runningBalance: '$1849.15' },
        { id: '6', date: new Date('2026-01-26T08:54:00'), transaction: 'Commission on order #20699', debitCredit: '$2.65', runningBalance: '$1843.20' },
        { id: '7', date: new Date('2026-01-26T08:32:00'), transaction: 'Commission on order #20698', debitCredit: '$2.65', runningBalance: '$1840.55' },
      ];
    },
  });

  const totalCommission = 1857.95;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
    toast({
      title: "Export Started",
      description: `Exporting transactions as ${format.toUpperCase()}...`,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="text-xl font-semibold text-gray-800">Statement</div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800">Earnings</h3>
                <p className="text-sm text-gray-500">Your commission transaction for all orders</p>
                <div className="mt-2">
                  <span className="text-sm text-gray-500">Total Commission: </span>
                  <span className="text-lg font-bold">${totalCommission.toFixed(2)}</span>
                </div>
              </div>
              
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-500 hover:bg-blue-600">
                    Create a Transaction <Plus className="h-4 w-4 ml-2" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Transaction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Transaction Description</label>
                      <Input placeholder="Enter description" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Amount</label>
                      <Input type="number" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Type</label>
                      <Select defaultValue="credit">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Credit</SelectItem>
                          <SelectItem value="debit">Debit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full bg-green-500 hover:bg-green-600">
                      Create Transaction
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input 
                  type="text" 
                  placeholder="Start date - End date" 
                  className="w-64"
                />
                <Button variant="outline" size="icon">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show</span>
                <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-gray-600">entries</span>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExport('excel')}
                  className="bg-gray-700 text-white hover:bg-gray-800"
                >
                  Excel
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExport('csv')}
                  className="bg-gray-700 text-white hover:bg-gray-800"
                >
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleExport('pdf')}
                  className="bg-gray-700 text-white hover:bg-gray-800"
                >
                  PDF
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Debit/Credit</TableHead>
                  <TableHead>Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                    <TableCell>{tx.transaction}</TableCell>
                    <TableCell className="text-blue-600 font-medium">{tx.debitCredit}</TableCell>
                    <TableCell>{tx.runningBalance}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {transactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No transactions found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
