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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PayOnDeliveryMethod {
  id: string;
  name: string;
  logo?: string;
  status: 'publish' | 'draft';
  createdAt: Date;
}

export default function PayOnDelivery() {
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PayOnDeliveryMethod | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    status: 'publish' as 'publish' | 'draft',
  });

  const { data: methods = [], isLoading } = useQuery<PayOnDeliveryMethod[]>({
    queryKey: ['/api/admin/pay-on-delivery'],
    queryFn: async () => {
      return [
        { id: '1', name: 'Cash on Delivery', status: 'publish' as const, createdAt: new Date() },
        { id: '2', name: 'AVAST', status: 'publish' as const, createdAt: new Date() },
      ];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pay-on-delivery'] });
      toast({
        title: "Success",
        description: editingMethod ? "Payment method updated" : "Payment method created",
      });
      setShowEditDialog(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pay-on-delivery'] });
      toast({
        title: "Deleted",
        description: "Payment method has been removed",
      });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', status: 'publish' });
    setEditingMethod(null);
  };

  const handleEdit = (method: PayOnDeliveryMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      status: method.status,
    });
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please enter a payment name",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Pay on delivery</span>
            <span>»</span>
            <span className="font-medium">{editingMethod ? 'Update' : 'List'}</span>
          </div>
        </div>

        {!showEditDialog ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pay on Delivery Methods</CardTitle>
              <Button onClick={() => setShowEditDialog(true)} className="bg-green-500 hover:bg-green-600">
                <Plus className="h-4 w-4 mr-2" /> Add New
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : methods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No payment methods found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Name</TableHead>
                      <TableHead>Logo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {methods.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">{method.name}</TableCell>
                        <TableCell>
                          {method.logo ? (
                            <img src={method.logo} alt={method.name} className="h-8 w-8 object-contain" />
                          ) : (
                            <span className="text-gray-400">No logo</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={method.status === 'publish' ? 'default' : 'secondary'}>
                            {method.status === 'publish' ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(method)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(method.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{editingMethod ? 'Update Payment Method' : 'Add Payment Method'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter payment name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Logo</label>
                <div className="flex items-center gap-4">
                  <Input type="text" placeholder="Payment Logo" className="flex-1" disabled />
                  <Button variant="outline" className="bg-blue-500 text-white hover:bg-blue-600">
                    <Upload className="h-4 w-4 mr-2" /> Browse
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v as 'publish' | 'draft'})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publish">Publish</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleSave} className="flex-1 bg-green-500 hover:bg-green-600">
                  Save
                </Button>
                <Button variant="outline" onClick={() => { setShowEditDialog(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
