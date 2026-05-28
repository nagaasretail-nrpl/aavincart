import { useQuery } from "@tanstack/react-query";
import MerchantLayout from "./layout";
import { useMerchantContext } from "./context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, MapPin, Phone, Mail, Globe, Clock } from "lucide-react";

function UnionInfoContent() {
  const { merchantId } = useMerchantContext();

  const { data: merchant, isLoading } = useQuery<any>({
    queryKey: ["/api/merchants", merchantId],
    queryFn: async () => {
      const res = await fetch(`/api/merchants/${merchantId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!merchantId,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store className="h-6 w-6 text-purple-600" />
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Union Information</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">View and manage your district union details</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : !merchant ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Union information not available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Union Name</p>
                <p className="font-medium">{merchant.restaurantName || merchant.businessName || merchant.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Union Code</p>
                <p className="font-medium">{merchant.unionCode || merchant.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={merchant.isOpen ? "bg-green-500" : "bg-red-500"}>
                  {merchant.isOpen ? "Active" : "Inactive"}
                </Badge>
              </div>
              {merchant.gstin && (
                <div>
                  <p className="text-sm text-muted-foreground">GSTIN</p>
                  <p className="font-medium font-mono">{merchant.gstin}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {merchant.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{merchant.contactPhone}</p>
                </div>
              )}
              {merchant.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{merchant.contactEmail}</p>
                </div>
              )}
              {merchant.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="font-medium">{merchant.address}</p>
                </div>
              )}
              {merchant.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{merchant.website}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Operating Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">
                  {merchant.openingTime || "06:00"} - {merchant.closingTime || "22:00"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MerchantUnionInfo() {
  return (
    <MerchantLayout>
      <UnionInfoContent />
    </MerchantLayout>
  );
}
