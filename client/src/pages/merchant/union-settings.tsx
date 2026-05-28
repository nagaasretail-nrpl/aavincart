import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Save, Store, Phone, Mail, MapPin, FileText, Truck } from "lucide-react";

function UnionSettingsContent() {
  const { merchantId } = useMerchantContext();
  const { toast } = useToast();

  const { data: merchant, isLoading } = useQuery<any>({
    queryKey: ["/api/merchants", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/merchants/${merchantId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!merchantId && merchantId.startsWith('merchant-'),
  });

  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (merchant && !formData) {
      setFormData({
        contactName: merchant.contactName || '',
        contactPhone: merchant.contactPhone || '',
        contactEmail: merchant.contactEmail || '',
        restaurantPhone: merchant.restaurantPhone || '',
        address: merchant.address || '',
        gstNumber: merchant.gstNumber || '',
        description: merchant.description || '',
        shortDescription: merchant.shortDescription || '',
        latitude: merchant.latitude || '',
        longitude: merchant.longitude || '',
        freeDelivery: merchant.freeDelivery || 0,
        deliveryDistanceCovered: merchant.deliveryDistanceCovered || '0',
        selfDelivery: merchant.selfDelivery || 0,
        closeStore: merchant.closeStore || 0,
        disabledOrdering: merchant.disabledOrdering || 0,
        pauseOrdering: merchant.pauseOrdering || 0,
      });
    }
  }, [merchant]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/merchant/settings", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", merchantId] });
      queryClient.invalidateQueries({ queryKey: ["/api/merchant/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update settings", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!formData) return;
    updateMutation.mutate(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!merchant || !formData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Settings not available. Please log in as a union.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-purple-600" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Union Settings</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Manage your district union configuration
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-purple-600 hover:bg-purple-700">
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="h-4 w-4" /> Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contact Person Name</Label>
              <Input
                value={formData.contactName}
                onChange={(e) => updateField('contactName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={formData.contactPhone}
                  onChange={(e) => updateField('contactPhone', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={formData.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Union Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={formData.restaurantPhone}
                  onChange={(e) => updateField('restaurantPhone', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Location & Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  value={formData.latitude}
                  onChange={(e) => updateField('latitude', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  value={formData.longitude}
                  onChange={(e) => updateField('longitude', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input
                value={formData.gstNumber}
                onChange={(e) => updateField('gstNumber', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input
                value={formData.shortDescription}
                onChange={(e) => updateField('shortDescription', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Ordering & Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Free Delivery Radius (km)</Label>
              <Input
                type="number"
                value={formData.freeDelivery}
                onChange={(e) => updateField('freeDelivery', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Delivery Distance (km)</Label>
              <Input
                value={formData.deliveryDistanceCovered}
                onChange={(e) => updateField('deliveryDistanceCovered', e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label>Self Delivery</Label>
              <Switch
                checked={formData.selfDelivery === 1}
                onCheckedChange={(v) => updateField('selfDelivery', v ? 1 : 0)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label>Close Store</Label>
              <Switch
                checked={formData.closeStore === 1}
                onCheckedChange={(v) => updateField('closeStore', v ? 1 : 0)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label>Pause Ordering</Label>
              <Switch
                checked={formData.pauseOrdering === 1}
                onCheckedChange={(v) => updateField('pauseOrdering', v ? 1 : 0)}
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <Label>Disable Ordering</Label>
              <Switch
                checked={formData.disabledOrdering === 1}
                onCheckedChange={(v) => updateField('disabledOrdering', v ? 1 : 0)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MerchantUnionSettings() {
  return (
    <MerchantLayout>
      <UnionSettingsContent />
    </MerchantLayout>
  );
}
