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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Copy, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface Promo {
  id: string;
  promoCode: string;
  promoName: string;
  discountType: string;
  discountValue: string;
  minimumOrderAmount: string;
  maximumDiscount: string;
  validFrom: Date;
  validTo: Date;
  usageLimit: number;
  usedCount: number;
  status: string;
  description: string | null;
  applicableFor: string;
}

export default function PromoManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: promos = [], isLoading, error } = useQuery<Promo[]>({
    queryKey: ['/api/admin/promos'],
  });

  const createPromoMutation = useMutation({
    mutationFn: async (promoData: any) => {
      const response = await fetch('/api/admin/promos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promoData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create promo');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promos'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Promo created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create promo",
        variant: "destructive",
      });
    },
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/promos/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete promo');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/promos'] });
      toast({
        title: "Success",
        description: "Promo deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete promo",
        variant: "destructive",
      });
    },
  });

  const handleCreatePromo = (formData: FormData) => {
    const promoData = {
      promoCode: formData.get('promoCode') as string,
      promoName: formData.get('promoName') as string,
      discountType: formData.get('discountType') as string,
      discountValue: formData.get('discountValue') as string,
      minimumOrderAmount: formData.get('minimumOrderAmount') as string,
      maximumDiscount: formData.get('maximumDiscount') as string,
      validFrom: new Date(formData.get('validFrom') as string),
      validTo: new Date(formData.get('validTo') as string),
      usageLimit: parseInt(formData.get('usageLimit') as string),
      applicableFor: formData.get('applicableFor') as string,
      description: formData.get('description') as string || null,
      status: 'active',
    };
    
    createPromoMutation.mutate(promoData);
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Promo code copied to clipboard",
    });
  };

  const filteredPromos = promos.filter((promo: Promo) =>
    promo.promoCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    promo.promoName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, color: 'text-green-600' },
      inactive: { variant: 'secondary' as const, color: 'text-gray-600' },
      expired: { variant: 'destructive' as const, color: 'text-red-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
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
        <p className="text-red-600">Failed to load promos</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/promos'] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-promos">
            Promo Management
          </h1>
          <p className="text-gray-600">Manage discount codes and promotional offers</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-promo">
              <Plus className="h-4 w-4 mr-2" />
              Create Promo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Promo</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreatePromo(new FormData(e.target as HTMLFormElement));
            }} className="space-y-4">
              <Input
                name="promoCode"
                placeholder="Promo Code (e.g., SAVE20)"
                required
                data-testid="input-promo-code"
              />
              <Input
                name="promoName"
                placeholder="Promo Name"
                required
                data-testid="input-promo-name"
              />
              <Select name="discountType" required>
                <SelectTrigger data-testid="select-discount-type">
                  <SelectValue placeholder="Discount Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
              <Input
                name="discountValue"
                type="number"
                step="0.01"
                placeholder="Discount Value"
                required
                data-testid="input-discount-value"
              />
              <Input
                name="minimumOrderAmount"
                type="number"
                step="0.01"
                placeholder="Minimum Order Amount"
                required
                data-testid="input-min-order"
              />
              <Input
                name="maximumDiscount"
                type="number"
                step="0.01"
                placeholder="Maximum Discount"
                required
                data-testid="input-max-discount"
              />
              <Input
                name="validFrom"
                type="date"
                placeholder="Valid From"
                required
                data-testid="input-valid-from"
              />
              <Input
                name="validTo"
                type="date"
                placeholder="Valid To"
                required
                data-testid="input-valid-to"
              />
              <Input
                name="usageLimit"
                type="number"
                placeholder="Usage Limit"
                required
                data-testid="input-usage-limit"
              />
              <Select name="applicableFor" required>
                <SelectTrigger data-testid="select-applicable-for">
                  <SelectValue placeholder="Applicable For" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="first_order">First Order Only</SelectItem>
                  <SelectItem value="delivery">Delivery Only</SelectItem>
                </SelectContent>
              </Select>
              <Input
                name="description"
                placeholder="Description (optional)"
                data-testid="input-description"
              />
              <Button type="submit" className="w-full" data-testid="button-submit-promo">
                Create Promo
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Promos</CardTitle>
          <CardDescription>Find promos by code or name</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search promos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-promos"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Promo Codes ({filteredPromos.length})</CardTitle>
          <CardDescription>All promotional codes in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPromos.map((promo: Promo) => (
                <TableRow key={promo.id} data-testid={`row-promo-${promo.id}`}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="font-mono font-medium" data-testid={`text-code-${promo.id}`}>
                        {promo.promoCode}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyPromoCode(promo.promoCode)}
                        data-testid={`button-copy-${promo.id}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-name-${promo.id}`}>
                    {promo.promoName}
                  </TableCell>
                  <TableCell data-testid={`text-discount-${promo.id}`}>
                    {promo.discountType === 'percentage' ? `${promo.discountValue}%` : `₹${promo.discountValue}`}
                  </TableCell>
                  <TableCell data-testid={`text-min-order-${promo.id}`}>
                    ₹{promo.minimumOrderAmount}
                  </TableCell>
                  <TableCell data-testid={`text-valid-period-${promo.id}`}>
                    <div className="text-sm">
                      <div>{new Date(promo.validFrom).toLocaleDateString()}</div>
                      <div className="text-gray-500">to {new Date(promo.validTo).toLocaleDateString()}</div>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-usage-${promo.id}`}>
                    {promo.usedCount} / {promo.usageLimit}
                  </TableCell>
                  <TableCell data-testid={`status-${promo.id}`}>
                    {getStatusBadge(promo.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-edit-${promo.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deletePromoMutation.mutate(promo.id)}
                        data-testid={`button-delete-${promo.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredPromos.length === 0 && (
            <div className="text-center py-8" data-testid="no-promos-message">
              <p className="text-gray-500">
                {searchQuery ? 'No promos found matching your search.' : 'No promos found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}