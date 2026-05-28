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
import { Plus, Search, Send, Eye, Trash2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  targetType: string;
  targetId: string | null;
  merchantId: string | null;
  orderId: string | null;
  isRead: boolean;
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
}

export default function NotificationManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: notifications = [], isLoading, error } = useQuery<Notification[]>({
    queryKey: ['/api/admin/notifications'],
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData: any) => {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create notification');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Notification sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      toast({
        title: "Success",
        description: "Notification deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  const handleCreateNotification = (formData: FormData) => {
    const notificationData = {
      title: formData.get('title') as string,
      message: formData.get('message') as string,
      type: formData.get('type') as string,
      targetType: formData.get('targetType') as string,
      targetId: formData.get('targetId') as string || null,
      merchantId: formData.get('merchantId') as string || null,
      isRead: false,
    };
    
    createNotificationMutation.mutate(notificationData);
  };

  const filteredNotifications = notifications.filter((notification: Notification) => {
    const matchesSearch = notification.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         notification.message?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      info: { variant: 'default' as const, color: 'text-blue-600' },
      warning: { variant: 'secondary' as const, color: 'text-yellow-600' },
      error: { variant: 'destructive' as const, color: 'text-red-600' },
      success: { variant: 'default' as const, color: 'text-green-600' },
      promotion: { variant: 'default' as const, color: 'text-purple-600' },
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.info;
    return <Badge variant={config.variant}>{type}</Badge>;
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
        <p className="text-red-600">Failed to load notifications</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] })}>
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
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-notifications">
            Notification Management
          </h1>
          <p className="text-gray-600">Send and manage notifications to users and merchants</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-notification">
              <Plus className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send New Notification</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateNotification(new FormData(e.target as HTMLFormElement));
            }} className="space-y-4">
              <Input
                name="title"
                placeholder="Notification Title"
                required
                data-testid="input-title"
              />
              <Textarea
                name="message"
                placeholder="Notification Message"
                required
                data-testid="input-message"
              />
              <Select name="type" required>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Notification Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                </SelectContent>
              </Select>
              <Select name="targetType" required>
                <SelectTrigger data-testid="select-target-type">
                  <SelectValue placeholder="Target Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="merchants">All Unions</SelectItem>
                  <SelectItem value="customers">All Customers</SelectItem>
                  <SelectItem value="specific">Specific User</SelectItem>
                </SelectContent>
              </Select>
              <Input
                name="targetId"
                placeholder="Target ID (for specific user)"
                data-testid="input-target-id"
              />
              <Input
                name="merchantId"
                placeholder="Union ID (optional)"
                data-testid="input-merchant-id"
              />
              <Button type="submit" className="w-full" data-testid="button-submit-notification">
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find notifications by title, message, or type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-notifications"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40" data-testid="select-type-filter">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="info">Information</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="promotion">Promotion</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications ({filteredNotifications.length})</CardTitle>
          <CardDescription>All sent notifications in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.map((notification: Notification) => (
                <TableRow key={notification.id} data-testid={`row-notification-${notification.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-title-${notification.id}`}>
                      {notification.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate text-sm text-gray-600" data-testid={`text-message-${notification.id}`}>
                      {notification.message}
                    </div>
                  </TableCell>
                  <TableCell data-testid={`type-${notification.id}`}>
                    {getTypeBadge(notification.type)}
                  </TableCell>
                  <TableCell data-testid={`text-target-${notification.id}`}>
                    {notification.targetType}
                  </TableCell>
                  <TableCell data-testid={`status-${notification.id}`}>
                    <Badge variant={notification.isRead ? 'default' : 'secondary'}>
                      {notification.isRead ? 'Read' : 'Unread'}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-sent-${notification.id}`}>
                    {notification.sentAt ? formatTimestamp(notification.sentAt) : 'Not sent'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" data-testid={`button-view-${notification.id}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteNotificationMutation.mutate(notification.id)}
                        data-testid={`button-delete-${notification.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredNotifications.length === 0 && (
            <div className="text-center py-8" data-testid="no-notifications-message">
              <p className="text-gray-500">
                {searchQuery || typeFilter !== 'all' ? 'No notifications found matching your criteria.' : 'No notifications found.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}