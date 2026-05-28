import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { insertPaymentGatewaySchema } from '@shared/schema';
import type { PaymentGateway } from '@shared/schema';
import { z } from 'zod';
import AdminLayout from './layout';

const formSchema = insertPaymentGatewaySchema.extend({
  logoFile: z.any().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function PaymentGatewayEdit() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const isEdit = Boolean(params?.id);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentCode: '',
      paymentName: '',
      status: 'active',
      onlinePayment: true,
      availableForPayout: false,
      availableForPlan: true,
      isProduction: false,
      logoType: 'image',
      logoImage: '',
      logoClassIcon: '',
      featuredImage: '',
      secretKey: '',
      publishableKey: '',
      webhooksSigningSecret: '',
      webhooksPlan: '',
      events: 'checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted, subscription_schedule.canceled',
    }
  });

  // Fetch payment gateway data for editing
  const { data: gateway, isLoading } = useQuery<PaymentGateway>({
    queryKey: ['/api/admin/payment-gateways', params?.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/payment-gateways/${params?.id}`);
      if (!response.ok) throw new Error('Failed to fetch payment gateway');
      return response.json();
    },
    enabled: isEdit && !!params?.id
  });

  // Load gateway data into form when available
  useEffect(() => {
    if (gateway && isEdit) {
      form.reset({
        paymentCode: gateway.paymentCode,
        paymentName: gateway.paymentName,
        status: gateway.status,
        onlinePayment: gateway.onlinePayment,
        availableForPayout: gateway.availableForPayout,
        availableForPlan: gateway.availableForPlan,
        isProduction: gateway.isProduction,
        logoType: gateway.logoType,
        logoImage: gateway.logoImage,
        logoClassIcon: gateway.logoClassIcon,
        featuredImage: gateway.featuredImage,
        secretKey: gateway.secretKey,
        publishableKey: gateway.publishableKey,
        webhooksSigningSecret: gateway.webhooksSigningSecret,
        webhooksPlan: gateway.webhooksPlan,
        events: gateway.events,
      });
      
      if (gateway.logoImage) {
        setLogoPreview(gateway.logoImage);
      }
    }
  }, [gateway, isEdit, form]);

  // Save payment gateway mutation
  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const method = isEdit ? 'PUT' : 'POST';
      const url = isEdit ? `/api/admin/payment-gateways/${params?.id}` : '/api/admin/payment-gateways';
      
      // Handle file upload if present
      if (data.logoFile && data.logoFile instanceof FileList && data.logoFile.length > 0) {
        // In a real app, you'd upload the file and get the URL
        // For now, we'll just use a placeholder URL
        data.logoImage = `/uploads/payment-gateways/${data.paymentCode}-logo.png`;
      }
      
      // Remove logoFile from data before sending to API
      const { logoFile, ...apiData } = data;
      
      return await apiRequest(method, url, apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-gateways'] });
      toast({
        title: "Success",
        description: `Payment gateway ${isEdit ? 'updated' : 'created'} successfully`,
      });
      setLocation('/admin/payment-gateway');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEdit ? 'update' : 'create'} payment gateway`,
        variant: "destructive",
      });
    }
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('logoFile', event.target.files);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    form.setValue('logoFile', undefined);
    form.setValue('logoImage', '');
  };

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  if (isLoading && isEdit) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6 max-w-4xl mx-auto px-4 md:px-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/payment-gateway">
          <Button variant="outline" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All Payment gateway
          </Button>
        </Link>
        <span className="text-gray-400">→</span>
        <span className="text-gray-600">{isEdit ? 'Update Gateway' : 'Create Gateway'}</span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Toggle Switches Row */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-8 py-4">
            <FormField
              control={form.control}
              name="onlinePayment"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-online-payment"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium">Online Payment</FormLabel>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="availableForPayout"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-available-payout"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium">Available for payout</FormLabel>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="availableForPlan"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-available-plan"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium">Available for plan</FormLabel>
                </FormItem>
              )}
            />
          </div>

          {/* Payment Code */}
          <FormField
            control={form.control}
            name="paymentCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isEdit}
                    className={isEdit ? "bg-gray-100 text-gray-500" : ""}
                    data-testid="input-payment-code"
                  />
                </FormControl>
                {isEdit && (
                  <p className="text-xs text-gray-500">The code must not have spaces</p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Payment Name */}
          <FormField
            control={form.control}
            name="paymentName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-payment-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Logo Type Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Logo type</h3>
            
            <FormField
              control={form.control}
              name="logoType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-logo-type">
                        <SelectValue placeholder="Select logo type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="icon">Icon</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logoClassIcon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo class icon</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., fab fa-credit-card" data-testid="input-logo-class" />
                  </FormControl>
                  <p className="text-xs text-gray-500">
                    Get icon here <a href="#" className="text-blue-500">Click here</a>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Featured Image Upload */}
            <div className="space-y-2">
              <Label>Featured Image</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 relative">
                {logoPreview ? (
                  <div className="relative inline-block">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="max-w-xs max-h-32 object-contain rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={removeLogo}
                      data-testid="button-remove-logo"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  data-testid="input-logo-upload"
                />
              </div>
              <Button type="button" variant="outline" size="sm" data-testid="button-browse">
                Browse
              </Button>
            </div>
          </div>

          {/* Credentials Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Credentials</h3>
            
            <FormField
              control={form.control}
              name="isProduction"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-production"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-medium">Production</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secretKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('paymentCode') === 'sbi_upi' ? 'SBI API Secret Key' : 'Secret Key'}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="password" data-testid="input-secret-key" />
                  </FormControl>
                  {form.watch('paymentCode') === 'sbi_upi' && (
                    <p className="text-xs text-gray-500">
                      Your SBI UPI API secret key from the SBI API Hub portal
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="publishableKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('paymentCode') === 'sbi_upi' ? 'Merchant VPA' : 'Publishable Key'}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={form.watch('paymentCode') === 'sbi_upi' ? 'merchant@sbi' : ''}
                      data-testid="input-publishable-key" 
                    />
                  </FormControl>
                  {form.watch('paymentCode') === 'sbi_upi' && (
                    <p className="text-xs text-gray-500">
                      Enter your SBI merchant VPA (Virtual Payment Address) for UPI payments
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webhooksSigningSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch('paymentCode') === 'sbi_upi' ? 'SBI Webhook Signing Secret' : 'Webhooks Signing secret'}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="password" data-testid="input-webhook-secret" />
                  </FormControl>
                  {form.watch('paymentCode') === 'sbi_upi' && (
                    <p className="text-xs text-gray-500">
                      Secret key for verifying webhook signatures from SBI UPI notifications
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Webhooks Plan */}
          <FormField
            control={form.control}
            name="webhooksPlan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhooks Plan</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://yourapp.com/api/webhooks" data-testid="input-webhook-url" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Events */}
          <FormField
            control={form.control}
            name="events"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Events</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    rows={3}
                    data-testid="textarea-webhook-events"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Save Button */}
          <div className="pt-6">
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
    </AdminLayout>
  );
}