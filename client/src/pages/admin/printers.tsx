import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import { Label } from '@/components/ui/label';
import { Printer, ArrowLeft, Plus, Settings, TestTube, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface PrinterConfig {
  id: string;
  name: string;
  type: 'receipt' | 'production' | 'label';
  ipAddress: string;
  port: string;
  status: 'online' | 'offline' | 'error';
  autoConnect: boolean;
  enabled: boolean;
}

export default function Printers() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    type: 'receipt',
    ipAddress: '',
    port: '9100',
    autoConnect: true,
  });

  const { data: printers = [], isLoading } = useQuery<PrinterConfig[]>({
    queryKey: ['/api/admin/printers'],
    queryFn: async () => [
      {
        id: '1',
        name: 'Production Printer 1',
        type: 'production',
        ipAddress: '192.168.1.100',
        port: '9100',
        status: 'online',
        autoConnect: true,
        enabled: true,
      },
      {
        id: '2',
        name: 'Receipt Printer',
        type: 'receipt',
        ipAddress: '192.168.1.101',
        port: '9100',
        status: 'offline',
        autoConnect: false,
        enabled: true,
      },
    ],
  });

  const addPrinterMutation = useMutation({
    mutationFn: async (printerData: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return printerData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/printers'] });
      toast({
        title: "Success",
        description: "Printer added successfully",
      });
      setShowAddForm(false);
      setNewPrinter({ name: '', type: 'receipt', ipAddress: '', port: '9100', autoConnect: true });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add printer",
        variant: "destructive",
      });
    },
  });

  const testPrinterMutation = useMutation({
    mutationFn: async (printerId: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return printerId;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test print completed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Test print failed",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      online: { variant: 'default' as const, color: 'text-green-600' },
      offline: { variant: 'secondary' as const, color: 'text-gray-600' },
      error: { variant: 'destructive' as const, color: 'text-red-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    return <Badge variant={config.variant}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      receipt: { variant: 'outline' as const },
      production: { variant: 'secondary' as const },
      label: { variant: 'default' as const },
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.receipt;
    return <Badge variant={config.variant}>{type}</Badge>;
  };

  const handleAddPrinter = () => {
    if (!newPrinter.name || !newPrinter.ipAddress) {
      toast({
        title: "Error",
        description: "Name and IP address are required",
        variant: "destructive",
      });
      return;
    }
    addPrinterMutation.mutate(newPrinter);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </AdminLayout>
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-printers">
              Printer Management
            </h1>
            <p className="text-gray-600">Configure and manage receipt and production printers</p>
          </div>
        </div>

        {showAddForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Add New Printer</CardTitle>
              <CardDescription>Configure a new printer for the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="printerName">Printer Name</Label>
                  <Input
                    id="printerName"
                    value={newPrinter.name}
                    onChange={(e) => setNewPrinter({...newPrinter, name: e.target.value})}
                    placeholder="Production Printer 1"
                    data-testid="input-printer-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="printerType">Printer Type</Label>
                  <Select value={newPrinter.type} onValueChange={(value) => setNewPrinter({...newPrinter, type: value})}>
                    <SelectTrigger data-testid="select-printer-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">Receipt Printer</SelectItem>
                      <SelectItem value="production">Production Printer</SelectItem>
                      <SelectItem value="label">Label Printer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    value={newPrinter.ipAddress}
                    onChange={(e) => setNewPrinter({...newPrinter, ipAddress: e.target.value})}
                    placeholder="192.168.1.100"
                    data-testid="input-ip-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    value={newPrinter.port}
                    onChange={(e) => setNewPrinter({...newPrinter, port: e.target.value})}
                    placeholder="9100"
                    data-testid="input-port"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newPrinter.autoConnect}
                  onCheckedChange={(checked) => setNewPrinter({...newPrinter, autoConnect: checked})}
                  data-testid="switch-auto-connect"
                />
                <Label>Auto Connect on Startup</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleAddPrinter}
                  disabled={addPrinterMutation.isPending}
                  data-testid="button-save-printer"
                >
                  {addPrinterMutation.isPending ? 'Adding...' : 'Add Printer'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Printer className="h-5 w-5" />
                  <span>Configured Printers</span>
                </div>
                <Button onClick={() => setShowAddForm(true)} data-testid="button-add-printer">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Printer
                </Button>
              </CardTitle>
              <CardDescription>Manage and configure printers for receipts and production orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Port</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Auto Connect</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {printers.map((printer: PrinterConfig) => (
                    <TableRow key={printer.id} data-testid={`row-printer-${printer.id}`}>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-printer-name-${printer.id}`}>
                          {printer.name}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`type-${printer.id}`}>
                        {getTypeBadge(printer.type)}
                      </TableCell>
                      <TableCell data-testid={`text-ip-${printer.id}`}>
                        {printer.ipAddress}
                      </TableCell>
                      <TableCell data-testid={`text-port-${printer.id}`}>
                        {printer.port}
                      </TableCell>
                      <TableCell data-testid={`status-${printer.id}`}>
                        {getStatusBadge(printer.status)}
                      </TableCell>
                      <TableCell data-testid={`text-auto-connect-${printer.id}`}>
                        {printer.autoConnect ? 'Yes' : 'No'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => testPrinterMutation.mutate(printer.id)}
                            disabled={testPrinterMutation.isPending}
                            data-testid={`button-test-${printer.id}`}
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-config-${printer.id}`}>
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-delete-${printer.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {printers.length === 0 && (
                <div className="text-center py-8" data-testid="no-printers-message">
                  <Printer className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No printers configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}