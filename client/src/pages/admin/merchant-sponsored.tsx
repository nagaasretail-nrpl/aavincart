import { useQuery } from "@tanstack/react-query";
import AdminLayout from './layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, Edit, Trash2, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { Merchant } from "@shared/schema";

export default function MerchantSponsored() {
  const { data: merchants, isLoading } = useQuery<Merchant[]>({
    queryKey: ["/api/admin/merchants"],
    queryFn: async () => {
      const res = await fetch("/api/admin/merchants", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch merchants");
      return res.json();
    },
  });

  const sponsoredMerchants = merchants?.filter(m => m.isSponsored === 1) || [];
  const nonSponsoredMerchants = merchants?.filter(m => m.isSponsored !== 1 && m.status === 'active') || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sponsored Unions</h1>
          <p className="text-muted-foreground">Manage featured and sponsored union listings</p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2 bg-yellow-500">
          <Star className="h-4 w-4 mr-2 fill-current" />
          {sponsoredMerchants.length} Sponsored
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            Currently Sponsored
          </CardTitle>
          <CardDescription>
            These unions appear prominently in search results and homepage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sponsoredMerchants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Union Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsoredMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {merchant.restaurantName}
                      </div>
                    </TableCell>
                    <TableCell>{merchant.contactEmail}</TableCell>
                    <TableCell>
                      <Badge variant={merchant.status === 'active' ? 'default' : 'secondary'}>
                        {merchant.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch checked={merchant.isFeatured === 1} />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sponsored unions yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available for Sponsorship</CardTitle>
          <CardDescription>
            Active unions that can be promoted to sponsored status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nonSponsoredMerchants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Union Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead className="text-right">Add to Sponsored</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonSponsoredMerchants.map((merchant) => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-medium">{merchant.restaurantName}</TableCell>
                    <TableCell>{merchant.contactEmail}</TableCell>
                    <TableCell>{merchant.ordersAdded || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Sponsorship
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>All active unions are already sponsored</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
}
