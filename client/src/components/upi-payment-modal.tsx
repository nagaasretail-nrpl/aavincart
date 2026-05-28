import { useState, useEffect } from "react";
import { X, QrCode, CheckCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  paymentData: {
    transactionId: string;
    merchantTransactionId: string;
    qrCodeData: string;
    amount: number;
    currency: string;
    expiresAt: string;
    status: string;
  };
}

export default function UpiPaymentModal({ 
  isOpen, 
  onClose, 
  orderId,
  paymentData 
}: UpiPaymentModalProps) {
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState(paymentData.status);
  
  // Poll payment status every 5 seconds
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['/api/upi/payment/status', paymentData.merchantTransactionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/upi/payment/status/${paymentData.merchantTransactionId}`);
      return response.json();
    },
    refetchInterval: paymentStatus === 'pending' ? 5000 : false, // Poll every 5 seconds if pending
    enabled: isOpen && !!paymentData.merchantTransactionId
  });

  // Update payment status when data changes
  useEffect(() => {
    if (statusData && statusData.status !== paymentStatus) {
      setPaymentStatus(statusData.status);
      
      if (statusData.status === 'success') {
        toast({
          title: "Payment Successful!",
          description: "Your order has been confirmed and you will receive a confirmation email.",
        });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else if (statusData.status === 'failed') {
        toast({
          title: "Payment Failed",
          description: "Please try again or use a different payment method.",
          variant: "destructive",
        });
      }
    }
  }, [statusData, paymentStatus, toast, onClose]);

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="h-6 w-6 text-yellow-600" />;
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'success':
        return 'Payment Completed';
      case 'failed':
        return 'Payment Failed';
      case 'pending':
      default:
        return 'Waiting for Payment';
    }
  };

  const getStatusBadgeVariant = () => {
    switch (paymentStatus) {
      case 'success':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
      default:
        return 'secondary';
    }
  };

  const generateQRCodeUrl = (qrData: string) => {
    // Generate QR code using a QR code service (you can use any QR code generator API)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  };

  const handleRefreshStatus = async () => {
    try {
      const response = await apiRequest("GET", `/api/upi/payment/status/${paymentData.merchantTransactionId}`);
      const data = await response.json();
      setPaymentStatus(data.status);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh payment status",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" data-testid="upi-payment-modal">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" data-testid="text-upi-payment-title">UPI Payment</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              data-testid="button-close-upi-payment"
              disabled={paymentStatus === 'pending'}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Payment Status */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-2">
              {getStatusIcon()}
              <span className="ml-2 text-lg font-semibold" data-testid="text-payment-status">
                {getStatusText()}
              </span>
            </div>
            <Badge variant={getStatusBadgeVariant()} data-testid="badge-payment-status">
              {paymentStatus.toUpperCase()}
            </Badge>
          </div>

          {/* QR Code (only show if pending) */}
          {paymentStatus === 'pending' && (
            <div className="text-center mb-6">
              <div className="bg-white p-4 rounded-lg border inline-block mb-4">
                <img 
                  src={generateQRCodeUrl(paymentData.qrCodeData)}
                  alt="UPI QR Code"
                  className="w-48 h-48"
                  data-testid="img-upi-qr-code"
                />
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Scan this QR code with any UPI app to complete your payment
              </p>
              <p className="text-xs text-gray-500">
                Or copy UPI ID: {paymentData.qrCodeData.match(/pa=([^&]+)/)?.[1] || 'N/A'}
              </p>
            </div>
          )}

          {/* Payment Details */}
          <div className="bg-muted p-4 rounded-lg mb-6" data-testid="payment-details">
            <h3 className="font-semibold mb-3">Payment Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Amount</span>
                <span data-testid="text-payment-amount">₹{parseFloat(paymentData.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Transaction ID</span>
                <span className="text-xs font-mono" data-testid="text-transaction-id">
                  {paymentData.merchantTransactionId}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Order ID</span>
                <span className="text-xs font-mono" data-testid="text-order-id">
                  {orderId}
                </span>
              </div>
              {paymentStatus === 'pending' && (
                <div className="flex justify-between">
                  <span>Expires At</span>
                  <span className="text-xs" data-testid="text-expires-at">
                    {new Date(paymentData.expiresAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {paymentStatus === 'pending' && (
              <Button
                className="w-full"
                variant="outline"
                onClick={handleRefreshStatus}
                disabled={isLoading}
                data-testid="button-refresh-status"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Checking...' : 'Refresh Status'}
              </Button>
            )}
            
            {paymentStatus !== 'pending' && (
              <Button
                className="w-full"
                onClick={onClose}
                data-testid="button-close-payment"
              >
                Close
              </Button>
            )}
          </div>

          {/* Payment Instructions */}
          {paymentStatus === 'pending' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">How to pay:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Open any UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                <li>2. Scan the QR code above or enter UPI ID</li>
                <li>3. Verify the amount and merchant details</li>
                <li>4. Complete the payment using your UPI PIN</li>
                <li>5. Wait for confirmation on this page</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}