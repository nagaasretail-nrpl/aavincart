import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, DollarSign, Clock, Star, Eye, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Order } from "@shared/schema";

const statusColors = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  ready: "bg-green-500",
  out_for_delivery: "bg-purple-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const statusLabels = {
  pending: "New",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function RestaurantDashboard() {
  // Mock union ID - in a real app, this would come from authentication
  const restaurantId = "1";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/orders", restaurantId],
    queryFn: async () => {
      const response = await fetch(`/api/orders?restaurantId=${restaurantId}`);
      return response.json();
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", restaurantId] });
      toast({
        title: "Order updated",
        description: "Order status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update order",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateOrderMutation.mutate({ orderId, status: newStatus });
  };

  // Calculate stats
  const todayOrders = orders.filter((order: Order) => {
    const orderDate = new Date(order.createdAt!);
    const today = new Date();
    return orderDate.toDateString() === today.toDateString();
  });

  const todayRevenue = todayOrders.reduce((sum: number, order: Order) => 
    sum + parseFloat(order.total), 0
  );

  const avgPrepTime = "18"; // Mock value
  const rating = "4.8"; // Mock value

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <Skeleton className="h-8 w-64" />
            <div className="flex space-x-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Union Dashboard</h1>
          <div className="flex space-x-3">
            <Button variant="outline" data-testid="button-view-menu">
              <Eye className="h-4 w-4 mr-2" />
              View Menu
            </Button>
            <Button variant="outline" data-testid="button-settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" data-testid="stats-cards">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Today's Orders</p>
                  <p className="text-2xl font-bold" data-testid="text-today-orders">{todayOrders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-accent" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Today's Revenue</p>
                  <p className="text-2xl font-bold" data-testid="text-today-revenue">${todayRevenue.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Clock className="h-6 w-6 text-secondary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Avg. Prep Time</p>
                  <p className="text-2xl font-bold" data-testid="text-avg-prep-time">{avgPrepTime}min</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Star className="h-6 w-6 text-destructive" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold" data-testid="text-rating">{rating}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Orders Table */}
        <Card data-testid="orders-table">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground" data-testid="text-no-orders">No orders yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Order ID</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Customer</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Items</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Total</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order: Order) => (
                      <tr key={order.id} data-testid={`order-row-${order.id}`}>
                        <td className="p-4 font-medium" data-testid={`text-order-id-${order.id}`}>
                          #{order.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="p-4" data-testid={`text-customer-${order.id}`}>
                          {order.customerName}
                        </td>
                        <td className="p-4" data-testid={`text-items-${order.id}`}>
                          {(order.items as any[]).length} item{(order.items as any[]).length !== 1 ? 's' : ''}
                        </td>
                        <td className="p-4" data-testid={`text-total-${order.id}`}>
                          ₹{order.total}
                        </td>
                        <td className="p-4">
                          <Badge 
                            className={`${statusColors[order.status as keyof typeof statusColors]} text-white`}
                            data-testid={`badge-status-${order.id}`}
                          >
                            {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) => handleStatusUpdate(order.id, newStatus)}
                            data-testid={`select-status-${order.id}`}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">New</SelectItem>
                              <SelectItem value="confirmed">Confirm</SelectItem>
                              <SelectItem value="preparing">Preparing</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancel</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
