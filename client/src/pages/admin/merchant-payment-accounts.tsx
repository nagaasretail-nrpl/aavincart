import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Power, Search, CreditCard } from "lucide-react";

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
  createdAt: string;
  updatedAt: string;
}

interface MerchantInfo {
  id: string;
  restaurantName?: string;
  contactName?: string;
  contactEmail?: string;
}

interface FormValues {
  merchantId: string;
  gatewayName: string;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  accountMode: string;
  accountName: string;
  contactEmail: string;
  contactMobile: string;
  isActive: boolean;
  autoCapture: boolean;
  refundEnabled: boolean;
}

const GATEWAY_OPTIONS = [
  { value: "razorpay", label: "Razorpay" },
  // { value: "cashfree", label: "Cashfree" }, // Hidden until re-enabled
  { value: "sbi", label: "SBI" },
];

const GATEWAY_FIELD_LABELS: Record<string, { keyIdLabel: string; keyIdPlaceholder: string; secretLabel: string; secretPlaceholder: string; webhookLabel: string }> = {
  razorpay: { keyIdLabel: "Key ID", keyIdPlaceholder: "rzp_live_...", secretLabel: "Key Secret", secretPlaceholder: "Enter Razorpay key secret", webhookLabel: "Webhook Secret" },
  cashfree: { keyIdLabel: "App ID", keyIdPlaceholder: "Enter Cashfree App ID", secretLabel: "Secret Key", secretPlaceholder: "Enter Cashfree secret key", webhookLabel: "Webhook Secret" },
  sbi: { keyIdLabel: "Merchant ID", keyIdPlaceholder: "Enter SBI Merchant ID", secretLabel: "Encryption Key", secretPlaceholder: "Enter SBI encryption key", webhookLabel: "Callback Secret" },
};

const GATEWAY_TOGGLES = [
  { key: "razorpay", label: "Razorpay" },
  { key: "cashfree", label: "Cashfree" },
  { key: "sbi", label: "SBI UPI" },
  { key: "cod", label: "Cash on Delivery" },
] as const;

type PaymentSettings = Record<string, boolean>;

function UnionGatewaySettings({ merchants }: { merchants: MerchantInfo[] }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [settingsMap, setSettingsMap] = useState<Record<string, PaymentSettings>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (merchants.length === 0) return;
    const fetchAll = async () => {
      setLoading(true);
      const map: Record<string, PaymentSettings> = {};
      await Promise.all(
        merchants.map(async (m) => {
          try {
            const res = await fetch(`/api/admin/merchants/${m.id}/payment-settings`, { credentials: "include" });
            if (res.ok) map[m.id] = await res.json();
            else map[m.id] = {};
          } catch { map[m.id] = {}; }
        })
      );
      setSettingsMap(map);
      setLoading(false);
    };
    fetchAll();
  }, [merchants]);

  const toggleGateway = async (merchantId: string, gateway: string, enabled: boolean) => {
    const prev = settingsMap[merchantId] || {};
    const updated = { ...prev, [gateway]: enabled };
    setSettingsMap(s => ({ ...s, [merchantId]: updated }));
    try {
      await apiRequest("PATCH", `/api/admin/merchants/${merchantId}/payment-settings`, { [gateway]: enabled });
      toast({ title: `${gateway} ${enabled ? "enabled" : "disabled"}` });
    } catch (err: any) {
      setSettingsMap(s => ({ ...s, [merchantId]: prev }));
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filtered = search
    ? merchants.filter(m => (m.restaurantName || m.id).toLowerCase().includes(search.toLowerCase()))
    : merchants;

  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search unions..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48">Union / Merchant</TableHead>
              {GATEWAY_TOGGLES.map(g => (
                <TableHead key={g.key} className="text-center w-32">{g.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(m => {
              const ps = settingsMap[m.id] || {};
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{m.restaurantName || m.contactName || m.id}</p>
                    <p className="text-xs text-muted-foreground font-mono">{m.id}</p>
                  </TableCell>
                  {GATEWAY_TOGGLES.map(g => (
                    <TableCell key={g.key} className="text-center">
                      <Switch
                        checked={ps[g.key] === true}
                        onCheckedChange={(checked) => toggleGateway(m.id, g.key, checked)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function AdminMerchantPaymentAccounts() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<GatewayAccount | null>(null);
  const [merchantSearch, setMerchantSearch] = useState("");

  const { data: accounts = [], isLoading } = useQuery<GatewayAccount[]>({
    queryKey: ["/api/admin/merchant-gateway-accounts"],
  });

  const { data: merchants = [] } = useQuery<MerchantInfo[]>({
    queryKey: ["/api/admin/merchants"],
  });

  const merchantMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of merchants) {
      map.set(m.id, m.restaurantName || m.contactName || m.id);
    }
    return map;
  }, [merchants]);

  const filteredMerchants = useMemo(() => {
    if (!merchantSearch) return merchants;
    const q = merchantSearch.toLowerCase();
    return merchants.filter(m =>
      (m.restaurantName || "").toLowerCase().includes(q) ||
      (m.id || "").toLowerCase().includes(q) ||
      (m.contactName || "").toLowerCase().includes(q)
    );
  }, [merchants, merchantSearch]);

  const getMerchantName = (merchantId: string) => merchantMap.get(merchantId) || merchantId;

  const form = useForm<FormValues>({
    defaultValues: {
      merchantId: "",
      gatewayName: "razorpay",
      keyId: "",
      keySecret: "",
      webhookSecret: "",
      accountMode: "live",
      accountName: "",
      contactEmail: "",
      contactMobile: "",
      isActive: true,
      autoCapture: true,
      refundEnabled: true,
    },
  });

  const selectedGateway = form.watch("gatewayName") || "razorpay";
  const fieldLabels = GATEWAY_FIELD_LABELS[selectedGateway] || GATEWAY_FIELD_LABELS.razorpay;

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiRequest("POST", "/api/admin/merchant-gateway-accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchant-gateway-accounts"] });
      toast({ title: "Gateway account created" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiRequest("PUT", `/api/admin/merchant-gateway-accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchant-gateway-accounts"] });
      toast({ title: "Gateway account updated" });
      closeDialog();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/admin/merchant-gateway-accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchant-gateway-accounts"] });
      toast({ title: "Gateway account deactivated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function openCreate() {
    setEditingAccount(null);
    setMerchantSearch("");
    form.reset({
      merchantId: "",
      gatewayName: "razorpay",
      keyId: "",
      keySecret: "",
      webhookSecret: "",
      accountMode: "live",
      accountName: "",
      contactEmail: "",
      contactMobile: "",
      isActive: true,
      autoCapture: true,
      refundEnabled: true,
    });
    setDialogOpen(true);
  }

  function openEdit(account: GatewayAccount) {
    setEditingAccount(account);
    setMerchantSearch("");
    form.reset({
      merchantId: account.merchantId,
      gatewayName: account.gatewayName || "razorpay",
      keyId: account.keyId,
      keySecret: "",
      webhookSecret: "",
      accountMode: account.accountMode,
      accountName: account.accountName || "",
      contactEmail: account.contactEmail || "",
      contactMobile: account.contactMobile || "",
      isActive: account.isActive,
      autoCapture: account.autoCapture,
      refundEnabled: account.refundEnabled,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingAccount(null);
    setMerchantSearch("");
    form.reset();
  }

  function onSubmit(values: FormValues) {
    if (editingAccount) {
      const data: Record<string, unknown> = {
        keyId: values.keyId,
        gatewayName: values.gatewayName,
        accountMode: values.accountMode,
        accountName: values.accountName,
        contactEmail: values.contactEmail,
        contactMobile: values.contactMobile,
        isActive: values.isActive,
        autoCapture: values.autoCapture,
        refundEnabled: values.refundEnabled,
      };
      if (values.keySecret) data.keySecret = values.keySecret;
      if (values.webhookSecret) data.webhookSecret = values.webhookSecret;
      updateMutation.mutate({ id: editingAccount.id, data });
    } else {
      createMutation.mutate({
        merchantId: values.merchantId,
        gatewayName: values.gatewayName,
        keyId: values.keyId,
        keySecret: values.keySecret,
        webhookSecret: values.webhookSecret || null,
        accountMode: values.accountMode,
        accountName: values.accountName,
        contactEmail: values.contactEmail,
        contactMobile: values.contactMobile,
        isActive: values.isActive,
        autoCapture: values.autoCapture,
        refundEnabled: values.refundEnabled,
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Gateway Management</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Add Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gateway Settings per Union
          </CardTitle>
          <p className="text-sm text-muted-foreground">Enable or disable payment gateways for each union. Unions can only update their credentials — they cannot switch off gateways.</p>
        </CardHeader>
        <CardContent>
          <UnionGatewaySettings merchants={merchants} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gateway Credentials & Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No gateway accounts configured</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant / Union</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Auto Capture</TableHead>
                    <TableHead>Refund</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Webhook</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{getMerchantName(account.merchantId)}</p>
                          <p className="text-xs text-muted-foreground font-mono">{account.merchantId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{account.accountName || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{account.gatewayName}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.accountMode === "live" ? "default" : "secondary"}>
                          {account.accountMode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.isActive ? "default" : "destructive"}>
                          {account.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>{account.autoCapture ? "Yes" : "No"}</TableCell>
                      <TableCell>{account.refundEnabled ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {account.updatedAt ? new Date(account.updatedAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.hasWebhookSecret ? "default" : "outline"}>
                          {account.hasWebhookSecret ? "Configured" : "None"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(account)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          {account.isActive && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deactivateMutation.mutate(account.id)}
                              disabled={deactivateMutation.isPending}
                            >
                              <Power className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Gateway Account" : "Add Gateway Account"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!editingAccount ? (
                <FormField control={form.control} name="merchantId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Merchant / Union</FormLabel>
                    <div className="space-y-2">
                      <Input
                        placeholder="Search by name or ID..."
                        value={merchantSearch}
                        onChange={(e) => setMerchantSearch(e.target.value)}
                      />
                      <Select value={field.value} onValueChange={(val) => {
                        field.onChange(val);
                        const merchant = merchants.find(m => m.id === val);
                        if (merchant) {
                          if (!form.getValues("accountName")) {
                            form.setValue("accountName", merchant.restaurantName || "");
                          }
                          if (merchant.contactEmail && !form.getValues("contactEmail")) {
                            form.setValue("contactEmail", merchant.contactEmail);
                          }
                        }
                      }}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a merchant/union" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {filteredMerchants.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.restaurantName || m.contactName || m.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormDescription>Select the merchant or union to assign a payment gateway</FormDescription>
                  </FormItem>
                )} />
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-muted-foreground">Merchant</p>
                  <p className="font-medium">{getMerchantName(editingAccount.merchantId)}</p>
                  <p className="text-xs text-muted-foreground font-mono">{editingAccount.merchantId}</p>
                </div>
              )}

              <FormField control={form.control} name="gatewayName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Gateway</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gateway" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GATEWAY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Choose which payment gateway this merchant will use</FormDescription>
                </FormItem>
              )} />

              <FormField control={form.control} name="accountName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Salem Union Razorpay" />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="keyId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fieldLabels.keyIdLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={fieldLabels.keyIdPlaceholder} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="keySecret" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fieldLabels.secretLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder={editingAccount ? "Already configured — leave blank to keep" : fieldLabels.secretPlaceholder} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="webhookSecret" render={({ field }) => (
                <FormItem>
                  <FormLabel>{fieldLabels.webhookLabel}</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder={editingAccount ? "Already configured — leave blank to keep" : "Enter webhook secret"} />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="accountMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Mode</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="contactEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="admin@example.com" />
                  </FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="contactMobile" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Mobile</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+91..." />
                  </FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-col items-center gap-2">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="autoCapture" render={({ field }) => (
                  <FormItem className="flex flex-col items-center gap-2">
                    <FormLabel>Auto Capture</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="refundEnabled" render={({ field }) => (
                  <FormItem className="flex flex-col items-center gap-2">
                    <FormLabel>Refund Enabled</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : editingAccount ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
