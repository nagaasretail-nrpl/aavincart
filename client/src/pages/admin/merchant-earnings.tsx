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
import { Plus, Eye, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MerchantEarning {
  id: string;
  merchantName: string;
  merchantLogo?: string;
  balance: string;
}

export default function MerchantEarnings() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState('10');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: merchants = [], isLoading } = useQuery<MerchantEarning[]>({
    queryKey: ['/api/admin/earnings/merchant'],
    queryFn: async () => {
      return [
        { id: '1', merchantName: 'Chowking', balance: '$161.50' },
        { id: '2', merchantName: 'Jollibee', balance: '$-1162.00' },
        { id: '3', merchantName: 'Panda Express', balance: '$0.00' },
        { id: '4', merchantName: 'Subway', balance: '$57.00' },
        { id: '5', merchantName: 'asha', balance: '$0.00' },
        { id: '6', merchantName: 'osatfood', balance: '$0.00' },
      ];
    },
  });

  const totalCommission = 1857.95;
  const totalBalance = 0.00;

  const filteredMerchants = merchants.filter(m => 
    m.merchantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = (format: 'excel' | 'csv' | 'pdf') => {
    toast({
      title: "Export Started",
      description: `Exporting earnings as ${format.toUpperCase()}...`,
    });
  };

  const handleViewDetails = (merchantId: string) => {
    toast({
      title: "View Details",
      description: `Opening details for merchant ${merchantId}`,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="text-xl font-semibold text-gray-800">Union Earnings</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Total Commission</div>
              <div className="text-2xl font-bold">${totalCommission.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500">Total Balance</div>
              <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex justify-center items-center">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-500 hover:bg-blue-600">
                    Create a Transaction <Plus className="h-4 w-4 ml-2" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Union Transaction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Union</label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select union" />
                        </SelectTrigger>
                        <SelectContent>
                          {merchants.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.merchantName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Input placeholder="Transaction description" />
                    </div>
                    <Button className="w-full bg-green-500 hover:bg-green-600">
                      Create Transaction
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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

              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="text-sm text-gray-600 mr-2">Search:</span>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                    placeholder="Search merchants..."
                  />
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
            </div>

            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Union</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="w-16">
                      {merchant.merchantLogo ? (
                        <img 
                          src={merchant.merchantLogo} 
                          alt={merchant.merchantName} 
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xs">
                            {merchant.merchantName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{merchant.merchantName}</TableCell>
                    <TableCell className={parseFloat(merchant.balance.replace('$', '').replace(',', '')) < 0 ? 'text-red-600' : ''}>
                      {merchant.balance}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewDetails(merchant.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

            {filteredMerchants.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No merchants found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
