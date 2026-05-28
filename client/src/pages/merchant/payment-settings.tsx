import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, CheckCircle, AlertTriangle, Key, Globe, Info, CreditCard, XCircle } from "lucide-react";

interface GatewayAccount {
  id: string;
  merchantId: string;
  gatewayName: string;
  accountMode: string;
  keyId: string;
  accountName: string | null;
  contactEmail: string | null;
  contactMobile: string | null;
  isActive: boolean;
  autoCapture: boolean;
  refundEnabled: boolean;
  hasWebhookSecret: boolean;
  updatedAt: string;
}

interface FormValues {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  accountName: string;
  contactEmail: string;
  contactMobile: string;
}

const GATEWAY_FIELD_LABELS: Record<string, { keyIdLabel: string; keyIdPlaceholder: string; secretLabel: string; secretPlaceholder: string; webhookLabel: string }> = {
  razorpay: { keyIdLabel: "Razorpay Key ID", keyIdPlaceholder: "rzp_live_...", secretLabel: "Razorpay Key Secret", secretPlaceholder: "Enter key secret", webhookLabel: "Webhook Secret" },
  cashfree: { keyIdLabel: "Cashfree App ID", keyIdPlaceholder: "Enter App ID", secretLabel: "Cashfree Secret Key", secretPlaceholder: "Enter secret key", webhookLabel: "Webhook Secret" },
  sbi: { keyIdLabel: "SBI Merchant ID", keyIdPlaceholder: "Enter Merchant ID", secretLabel: "SBI Encryption Key", secretPlaceholder: "Enter encryption key", webhookLabel: "Callback Secret" },
};

const GATEWAY_NAMES: Record<string, string> = {
  razorpay: "Razorpay",
  cashfree: "Cashfree",
  sbi: "SBI UPI",
  cod: "Cash on Delivery",
};

export default function MerchantPaymentSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const merchantId = (user as any)?.unionId || (user as any)?.merchantId || (user as any)?.restaurantId || '';

  const { data: accounts, isLoading } = useQuery<GatewayAccount[]>({
    queryKey: ["/api/merchant/my-gateway-account"],
  });

  const { data: adminSettings } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/admin/merchants", merchantId, "payment-settings"],
    enabled: !!merchantId,
  });

  const existingAccount = accounts && accounts.length > 0 ? accounts[0] : null;
  const gatewayName = existingAccount?.gatewayName || "razorpay";
  const fieldLabels = GATEWAY_FIELD_LABELS[gatewayName] || GATEWAY_FIELD_LABELS.razorpay;

  const form = useForm<FormValues>({
    defaultValues: {
      keyId: "",
      keySecret: "",
      webhookSecret: "",
      accountName: "",
      contactEmail: "",
      contactMobile: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("PUT", "/api/merchant/gateway-account", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/my-gateway-account"] });
      toast({ title: "Payment gateway credentials updated successfully" });
      form.reset({ keyId: "", keySecret: "", webhookSecret: "", accountName: "", contactEmail: "", contactMobile: "" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function onSubmit(values: FormValues) {
    const data: Record<string, unknown> = {};
    if (values.keyId) data.keyId = values.keyId;
    if (values.keySecret) data.keySecret = values.keySecret;
    if (values.webhookSecret) data.webhookSecret = values.webhookSecret;
    if (values.accountName) data.accountName = values.accountName;
    if (values.contactEmail) data.contactEmail = values.contactEmail;
    if (values.contactMobile) data.contactMobile = values.contactMobile;

    if (Object.keys(data).length === 0) {
      toast({ title: "No changes", description: "Please fill in at least one field to update.", variant: "destructive" });
      return;
    }
    updateMutation.mutate(data);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!existingAccount) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Gateway Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your payment gateway credentials</p>
          </div>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Info className="h-12 w-12 text-blue-500 mx-auto" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">No Payment Gateway Assigned</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Your administrator has not yet assigned a payment gateway to your union.
                  Please contact your admin to set up a payment gateway (Razorpay, Cashfree, or SBI) for your account.
                </p>
                <p className="text-xs text-muted-foreground">
                  Once assigned, you will be able to update your API credentials here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Gateway Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your payment gateway credentials for direct settlement to your bank account</p>
        </div>

        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {existingAccount.accountName || existingAccount.merchantId}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">{existingAccount.merchantId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {adminSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Enabled Payment Gateways
              </CardTitle>
              <CardDescription>These gateways are managed by the admin. Contact admin to enable or disable gateways.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(GATEWAY_NAMES).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg border">
                    {adminSettings[key] === true ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-300" />
                    )}
                    <span className={adminSettings[key] === true ? "text-sm font-medium" : "text-sm text-muted-foreground"}>{label}</span>
                    <Badge variant={adminSettings[key] === true ? "default" : "secondary"} className="text-[10px]">
                      {adminSettings[key] === true ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Current Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Gateway</p>
                <Badge variant="outline" className="capitalize mt-1">{existingAccount.gatewayName}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={existingAccount.isActive ? "default" : "destructive"} className="mt-1">
                  {existingAccount.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Key ID</p>
                <p className="text-sm font-mono mt-1">{existingAccount.keyId}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Webhook</p>
                <Badge variant={existingAccount.hasWebhookSecret ? "default" : "secondary"} className="mt-1">
                  {existingAccount.hasWebhookSecret ? "Configured" : "Not Set"}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mode</p>
                <Badge variant={existingAccount.accountMode === "live" ? "default" : "secondary"} className="mt-1">
                  {existingAccount.accountMode}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Auto Capture</p>
                <p className="text-sm mt-1">{existingAccount.autoCapture ? "Enabled" : "Disabled"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Refund</p>
                <p className="text-sm mt-1">{existingAccount.refundEnabled ? "Enabled" : "Disabled"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className="text-sm mt-1">{existingAccount.updatedAt ? new Date(existingAccount.updatedAt).toLocaleDateString("en-IN") : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Update Credentials
            </CardTitle>
            <CardDescription>
              Update your API credentials below. Leave fields blank to keep current values.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg mb-4">
              <Globe className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Gateway type: <span className="font-semibold capitalize">{existingAccount.gatewayName}</span> (managed by admin)
              </span>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="accountName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={existingAccount.accountName || "e.g. My Business Account"} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="keyId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldLabels.keyIdLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={`Current: ${existingAccount.keyId} — enter new to update`} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="keySecret" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldLabels.secretLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Already configured — leave blank to keep" />
                    </FormControl>
                    <FormDescription>
                      <span className="flex items-center gap-1 text-xs">
                        <Shield className="h-3 w-3" /> Encrypted with AES-256-GCM. Never stored in plain text.
                      </span>
                    </FormDescription>
                  </FormItem>
                )} />

                <FormField control={form.control} name="webhookSecret" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{fieldLabels.webhookLabel}</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder={existingAccount.hasWebhookSecret ? "Already configured — leave blank to keep" : "Enter webhook secret (optional)"} />
                    </FormControl>
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactEmail" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder={existingAccount.contactEmail || "admin@example.com"} />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="contactMobile" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Mobile</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={existingAccount.contactMobile || "+91..."} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
                    {updateMutation.isPending ? "Saving..." : <><CheckCircle className="h-4 w-4" /> Update Credentials</>}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Important Notes</p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 space-y-1 list-disc list-inside">
                  <li>Your payment gateway credentials are encrypted and stored securely</li>
                  <li>Only you and the admin can see your configuration (secrets are never displayed)</li>
                  <li>Contact admin to change gateway type, activate/deactivate, or change mode</li>
                  <li>Set up webhooks in your gateway dashboard pointing to the URL provided by admin</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
