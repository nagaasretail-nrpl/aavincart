import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, User, Phone, MessageCircle, MapPin, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@shared/schema";

interface OrderTrackingProps {
  orderId: string;
}

const statusSteps = [
  { status: "confirmed", label: "Order Confirmed", icon: CheckCircle },
  { status: "preparing", label: "Union Preparing", icon: Clock },
  { status: "ready", label: "Ready for Pickup", icon: CheckCircle },
  { status: "out_for_delivery", label: "Out for Delivery", icon: MapPin },
  { status: "delivered", label: "Delivered", icon: CheckCircle },
];

const statusOrder = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];

function getStatusIndex(status: string): number {
  return statusOrder.indexOf(status);
}

function getStatusTime(status: string, createdAt: string): string {
  const baseTime = new Date(createdAt);
  const statusIndex = getStatusIndex(status);
  
  // Add mock time progression based on status
  const timeOffsets = [0, 1, 15, 25, 30, 45]; // minutes after order creation
  const targetTime = new Date(baseTime.getTime() + timeOffsets[statusIndex] * 60000);
  
  return targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getEstimatedDeliveryTime(createdAt: string): string {
  const baseTime = new Date(createdAt);
  const estimatedTime = new Date(baseTime.getTime() + 45 * 60000); // 45 minutes estimate
  return estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function OrderTracking({ orderId }: OrderTrackingProps) {
  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: ["/api/orders", orderId],
  });

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto" data-testid="order-tracking-loading">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !order) {
    return (
      <Card className="w-full max-w-2xl mx-auto" data-testid="order-tracking-error">
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground" data-testid="text-order-not-found">
            Order not found or failed to load.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status);
  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid={`order-tracking-${orderId}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl mb-2" data-testid={`text-order-number-${orderId}`}>
              Order #{order.id.slice(-8).toUpperCase()}
            </CardTitle>
            <p className="text-muted-foreground" data-testid={`text-order-created-${orderId}`}>
              Placed on {new Date(order.createdAt!).toLocaleDateString()} at {new Date(order.createdAt!).toLocaleTimeString()}
            </p>
          </div>
          <Badge 
            variant={isCancelled ? "destructive" : isDelivered ? "default" : "secondary"}
            className={isCancelled ? "" : isDelivered ? "bg-emerald-500" : "bg-accent text-accent-foreground"}
            data-testid={`badge-order-status-${orderId}`}
          >
            {isCancelled ? "Cancelled" : order.status === "out_for_delivery" ? "On the way" : order.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!isCancelled && (
          <>
            {/* Order Progress */}
            <div data-testid={`order-progress-${orderId}`}>
              <h4 className="font-semibold mb-4">Order Progress</h4>
              <div className="space-y-4">
                {statusSteps.map((step, index) => {
                  const isCompleted = currentStatusIndex > index;
                  const isCurrent = currentStatusIndex === index;
                  const StepIcon = step.icon;
                  
                  return (
                    <div key={step.status} className="flex items-center justify-between" data-testid={`progress-step-${step.status}-${orderId}`}>
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isCompleted || isCurrent
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted border-2 border-border"
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : isCurrent ? (
                            <StepIcon className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className={`ml-3 font-medium ${
                          isCurrent ? "text-foreground" : 
                          isCompleted ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground" data-testid={`step-time-${step.status}-${orderId}`}>
                        {isCompleted || isCurrent ? 
                          getStatusTime(step.status, String(order.createdAt!)) : 
                          step.status === "delivered" ? 
                            `Est. ${getEstimatedDeliveryTime(String(order.createdAt!))}` : 
                            ""
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Driver Info - Show only for delivery orders that are out for delivery */}
            {order.orderType === "delivery" && order.status === "out_for_delivery" && (
              <div className="bg-muted p-4 rounded-lg" data-testid={`driver-info-${orderId}`}>
                <h4 className="font-semibold mb-3">Your Delivery Driver</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=50&h=50"
                      alt="Delivery driver"
                      className="w-12 h-12 rounded-full object-cover"
                      data-testid={`img-driver-avatar-${orderId}`}
                    />
                    <div className="ml-3">
                      <h5 className="font-medium" data-testid={`text-driver-name-${orderId}`}>John D.</h5>
                      <p className="text-sm text-muted-foreground">Your delivery driver</p>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span data-testid={`text-driver-eta-${orderId}`}>5 min away</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="secondary" size="icon" data-testid={`button-call-driver-${orderId}`}>
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" data-testid={`button-message-driver-${orderId}`}>
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Delivery Information */}
        <div data-testid={`delivery-info-${orderId}`}>
          <h4 className="font-semibold mb-3">Delivery Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order Type:</span>
              <span className="capitalize" data-testid={`text-order-type-${orderId}`}>{order.orderType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer:</span>
              <span data-testid={`text-customer-info-${orderId}`}>{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span data-testid={`text-customer-phone-${orderId}`}>{order.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {order.orderType === "delivery" ? "Address:" : "Pickup Location:"}
              </span>
              <span className="text-right" data-testid={`text-address-${orderId}`}>
                {order.deliveryAddress}
              </span>
            </div>
            {order.deliveryInstructions && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Instructions:</span>
                <span className="text-right" data-testid={`text-instructions-${orderId}`}>
                  {order.deliveryInstructions}
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Order Items */}
        <div data-testid={`order-items-${orderId}`}>
          <h4 className="font-semibold mb-3">Order Items</h4>
          <div className="space-y-2">
            {(order.items as any[]).map((item, index) => (
              <div key={index} className="flex justify-between items-center" data-testid={`order-item-${index}-${orderId}`}>
                <span data-testid={`text-item-name-${index}-${orderId}`}>
                  {item.quantity}x {item.name}
                </span>
                <span data-testid={`text-item-price-${index}-${orderId}`}>
                  ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            
            <Separator className="my-3" />
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span data-testid={`text-subtotal-${orderId}`}>₹{order.subtotal}</span>
              </div>
              {parseFloat(order.deliveryFee) > 0 && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span data-testid={`text-delivery-fee-${orderId}`}>₹{order.deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax</span>
                <span data-testid={`text-tax-${orderId}`}>₹{order.tax}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span data-testid={`text-total-${orderId}`}>₹{order.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div data-testid={`payment-info-${orderId}`}>
          <h4 className="font-semibold mb-2">Payment Method</h4>
          <p className="text-sm text-muted-foreground capitalize" data-testid={`text-payment-method-${orderId}`}>
            {order.paymentMethod.replace('_', ' ')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
