import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Image, Save, Upload } from "lucide-react";

function BannerContent() {
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

  const [headerImage, setHeaderImage] = useState('');
  const [logo, setLogo] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (merchant && !initialized) {
      setHeaderImage(merchant.headerImage || '');
      setLogo(merchant.logo || '');
      setInitialized(true);
    }
  }, [merchant]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/merchant/settings", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Banner updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/merchants", merchantId] });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update banner", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Image className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500">Banner settings not available. Please log in as a union.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Image className="h-6 w-6 text-purple-600" />
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Banner & Branding</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage your union's logo and banner images
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Union Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logo ? (
              <div className="border rounded-lg p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <img src={logo} alt="Logo" className="max-h-32 object-contain" />
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-gray-400">
                <Upload className="h-8 w-8 mb-2" />
                <p className="text-sm">No logo set</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Header Banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {headerImage ? (
              <div className="border rounded-lg p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                <img src={headerImage} alt="Banner" className="max-h-32 w-full object-cover rounded" />
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-gray-400">
                <Upload className="h-8 w-8 mb-2" />
                <p className="text-sm">No banner set</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Banner URL</Label>
              <Input
                value={headerImage}
                onChange={(e) => setHeaderImage(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => updateMutation.mutate({ logo, headerImage })}
          disabled={updateMutation.isPending}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateMutation.isPending ? "Saving..." : "Save Banner Settings"}
        </Button>
      </div>
    </div>
  );
}

export default function MerchantBanner() {
  return (
    <MerchantLayout>
      <BannerContent />
    </MerchantLayout>
  );
}
