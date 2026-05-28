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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Send, Eye, Edit, Trash2, Mail, MessageSquare, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface MarketingCampaign {
  id: string;
  name: string;
  description: string | null;
  message: string;
  type: string;
  targetAudience: string;
  status: string;
  subject: string | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  recipientCount: number;
  deliveredCount: number;
  openCount: number;
  clickCount: number;
  createdAt: Date;
}

export default function MarketingManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: campaigns = [], isLoading, error } = useQuery<MarketingCampaign[]>({
    queryKey: ['/api/admin/campaigns'],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Marketing campaign created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive",
      });
    },
  });

  const handleCreateCampaign = (formData: FormData) => {
    const campaignData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      message: formData.get('message') as string,
      type: formData.get('type') as string,
      targetAudience: formData.get('targetAudience') as string,
      subject: formData.get('subject') as string || null,
      scheduledAt: formData.get('scheduledAt') ? new Date(formData.get('scheduledAt') as string) : null,
      status: 'draft',
    };
    
    createCampaignMutation.mutate(campaignData);
  };

  const filteredCampaigns = campaigns.filter((campaign: MarketingCampaign) => {
    const matchesSearch = campaign.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, color: 'text-gray-600' },
      scheduled: { variant: 'default' as const, color: 'text-blue-600' },
      sending: { variant: 'default' as const, color: 'text-yellow-600' },
      sent: { variant: 'default' as const, color: 'text-green-600' },
      paused: { variant: 'secondary' as const, color: 'text-orange-600' },
      cancelled: { variant: 'destructive' as const, color: 'text-red-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{status}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Send className="h-4 w-4" />;
    }
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
        <p className="text-red-600">Failed to load marketing campaigns</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] })}>
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
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-marketing">
            Marketing Campaigns
          </h1>
          <p className="text-gray-600">Create and manage email and SMS marketing campaigns</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-campaign">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Marketing Campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateCampaign(new FormData(e.target as HTMLFormElement));
            }} className="space-y-4">
              <Input
                name="name"
                placeholder="Campaign Name"
                required
                data-testid="input-name"
              />
              <Input
                name="subject"
                placeholder="Email Subject (for email campaigns)"
                data-testid="input-subject"
              />
              <Textarea
                name="description"
                placeholder="Campaign Description"
                data-testid="input-description"
              />
              <Textarea
                name="message"
                placeholder="Campaign Message"
                required
                data-testid="input-message"
              />
              <Select name="type" required>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Campaign Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push Notification</SelectItem>
                </SelectContent>
              </Select>
              <Select name="targetAudience" required>
                <SelectTrigger data-testid="select-audience">
                  <SelectValue placeholder="Target Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="merchants">All Unions</SelectItem>
                  <SelectItem value="customers">All Customers</SelectItem>
                  <SelectItem value="active_customers">Active Customers</SelectItem>
                  <SelectItem value="new_customers">New Customers</SelectItem>
                </SelectContent>
              </Select>
              <Input
                name="scheduledAt"
                type="datetime-local"
                placeholder="Schedule Date (optional)"
                data-testid="input-scheduled"
              />
              <Button type="submit" className="w-full" data-testid="button-submit-campaign">
                Create Campaign
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find campaigns by name or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-campaigns"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="sending">Sending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marketing Campaigns ({filteredCampaigns.length})</CardTitle>
          <CardDescription>All marketing campaigns in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign: MarketingCampaign) => (
                <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium" data-testid={`text-name-${campaign.id}`}>
                        {campaign.name}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-description-${campaign.id}`}>
                        {campaign.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(campaign.type)}
                      <span data-testid={`text-type-${campaign.id}`}>
                        {campaign.type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-audience-${campaign.id}`}>
                    {campaign.targetAudience.replace('_', ' ')}
                  </TableCell>
                  <TableCell data-testid={`status-${campaign.id}`}>
                    {getStatusBadge(campaign.status)}
                  </TableCell>
                  <TableCell data-testid={`text-recipients-${campaign.id}`}>
                    {campaign.recipientCount}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm" data-testid={`text-performance-${campaign.id}`}>
                      <div>Delivered: {campaign.deliveredCount}</div>
                      <div>Opens: {campaign.openCount}</div>
                      <div>Clicks: {campaign.clickCount}</div>
                    </div>
                  </TableCell>
                  <TableCell data-testid={`text-scheduled-${campaign.id}`}>
                    {campaign.scheduledAt 
                      ? formatTimestamp(campaign.scheduledAt)
                      : campaign.sentAt 
                        ? formatTimestamp(campaign.sentAt)
                        : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-${campaign.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" data-testid={`button-edit-${campaign.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {campaign.status === 'draft' && (
                        <Button variant="outline" size="sm" data-testid={`button-send-${campaign.id}`}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                        data-testid={`button-delete-${campaign.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredCampaigns.length === 0 && (
            <div className="text-center py-8" data-testid="no-campaigns-message">
              <p className="text-gray-500">
                {searchQuery || statusFilter !== 'all' ? 'No campaigns found matching your criteria.' : 'No marketing campaigns found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}