import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, Crown, Users, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface Plan {
  id: string;
  planName: string;
  planDescription: string | null;
  planPrice: string;
  planDuration: number;
  maxItems: number;
  maxOrders: number;
  commissionRate: string;
  status: string;
  createdAt: Date;
}

export default function MembershipManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: plans = [], isLoading, error } = useQuery<Plan[]>({
    queryKey: ['/api/admin/plans'],
  });

  const createPlanMutation = useMutation({
    mutationFn: async (planData: any) => {
      const response = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create plan');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Membership plan created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create plan",
        variant: "destructive",
      });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete plan');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] });
      toast({
        title: "Success",
        description: "Plan deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive",
      });
    },
  });

  const handleCreatePlan = (formData: FormData) => {
    const planData = {
      planName: formData.get('planName') as string,
      planDescription: formData.get('planDescription') as string || null,
      planPrice: formData.get('planPrice') as string,
      planDuration: parseInt(formData.get('planDuration') as string),
      maxItems: parseInt(formData.get('maxItems') as string),
      maxOrders: parseInt(formData.get('maxOrders') as string),
      commissionRate: formData.get('commissionRate') as string,
      status: 'active',
    };
    
    createPlanMutation.mutate(planData);
  };

  const filteredPlans = plans.filter((plan: Plan) =>
    plan.planName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.planDescription?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, color: 'text-green-600' },
      inactive: { variant: 'secondary' as const, color: 'text-gray-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant}>{status}</Badge>;
  };

  const getPlanIcon = (planName: string) => {
    if (planName.toLowerCase().includes('premium') || planName.toLowerCase().includes('pro')) {
      return <Crown className="h-4 w-4 text-yellow-500" />;
    }
    return <Users className="h-4 w-4 text-blue-500" />;
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
        <p className="text-red-600">Failed to load membership plans</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/plans'] })}>
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
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-membership">
            Membership Plans
          </h1>
          <p className="text-gray-600">Manage subscription plans for merchants</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-plan">
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Membership Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreatePlan(new FormData(e.target as HTMLFormElement));
            }} className="space-y-4">
              <Input
                name="planName"
                placeholder="Plan Name (e.g., Basic, Premium)"
                required
                data-testid="input-plan-name"
              />
              <Textarea
                name="planDescription"
                placeholder="Plan Description"
                data-testid="input-plan-description"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="planPrice"
                  type="number"
                  step="0.01"
                  placeholder="Monthly Price"
                  required
                  data-testid="input-plan-price"
                />
                <Input
                  name="planDuration"
                  type="number"
                  placeholder="Duration (days)"
                  required
                  data-testid="input-plan-duration"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="maxItems"
                  type="number"
                  placeholder="Max Menu Items"
                  required
                  data-testid="input-max-items"
                />
                <Input
                  name="maxOrders"
                  type="number"
                  placeholder="Max Monthly Orders"
                  required
                  data-testid="input-max-orders"
                />
              </div>
              <Input
                name="commissionRate"
                type="number"
                step="0.1"
                placeholder="Commission Rate (%)"
                required
                data-testid="input-commission-rate"
              />
              <Button type="submit" className="w-full" data-testid="button-submit-plan">
                Create Plan
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Plans</CardTitle>
          <CardDescription>Find membership plans by name or description</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-plans"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membership Plans ({filteredPlans.length})</CardTitle>
          <CardDescription>All subscription plans for merchants</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Max Items</TableHead>
                <TableHead>Max Orders</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan: Plan) => (
                <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPlanIcon(plan.planName)}
                      <div>
                        <div className="font-medium" data-testid={`text-name-${plan.id}`}>
                          {plan.planName}
                        </div>
                        <div className="text-sm text-gray-500" data-testid={`text-description-${plan.id}`}>
                          {plan.planDescription}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-price-${plan.id}`}>
                      ${plan.planPrice}/month
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-duration-${plan.id}`}>
                    {plan.planDuration} days
                  </TableCell>
                  <TableCell data-testid={`text-max-items-${plan.id}`}>
                    {plan.maxItems === 0 ? 'Unlimited' : plan.maxItems}
                  </TableCell>
                  <TableCell data-testid={`text-max-orders-${plan.id}`}>
                    {plan.maxOrders === 0 ? 'Unlimited' : plan.maxOrders}
                  </TableCell>
                  <TableCell data-testid={`text-commission-${plan.id}`}>
                    {plan.commissionRate}%
                  </TableCell>
                  <TableCell data-testid={`status-${plan.id}`}>
                    {getStatusBadge(plan.status)}
                  </TableCell>
                  <TableCell data-testid={`text-created-${plan.id}`}>
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-edit-${plan.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deletePlanMutation.mutate(plan.id)}
                        data-testid={`button-delete-${plan.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredPlans.length === 0 && (
            <div className="text-center py-8" data-testid="no-plans-message">
              <p className="text-gray-500">
                {searchQuery ? 'No plans found matching your search.' : 'No membership plans found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}