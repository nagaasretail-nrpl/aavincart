import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Copy,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface DuplicateGroup {
  name: string;
  restaurantId: string;
  restaurantName: string;
  items: Array<{
    id: string;
    name: string;
    category: string;
    price: string;
    mrp: string;
    isAvailable: boolean;
    productSegment: string;
    image?: string;
    description?: string;
    hsnCode?: string;
    packagingType?: string;
    unitsPerPackage?: number;
  }>;
}

export default function DuplicateProducts() {
  const { toast } = useToast();
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const { data: duplicates = [], isLoading, refetch } = useQuery<DuplicateGroup[]>({
    queryKey: ['/api/admin/duplicate-products'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest('DELETE', `/api/admin/menu-items/${itemId}`);
    },
    onSuccess: (_, itemId) => {
      setDeletedIds(prev => { const next = new Set(Array.from(prev)); next.add(itemId); return next; });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/duplicate-products'] });
      toast({
        title: "Deleted",
        description: "Duplicate product removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const activeDuplicates = duplicates.filter(group =>
    group.items.filter(item => !deletedIds.has(item.id)).length > 1
  );

  const totalDuplicateItems = activeDuplicates.reduce(
    (sum, group) => sum + group.items.filter(item => !deletedIds.has(item.id)).length - 1, 0
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/utilities">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Utilities
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900">
              Duplicate Products
            </h1>
            <p className="text-gray-600">Find and remove duplicate product entries across all unions</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Copy className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeDuplicates.length}</p>
                  <p className="text-sm text-gray-500">Duplicate Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDuplicateItems}</p>
                  <p className="text-sm text-gray-500">Extra Copies to Remove</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{deletedIds.size}</p>
                  <p className="text-sm text-gray-500">Deleted This Session</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-500">Scanning for duplicate products...</span>
          </div>
        ) : activeDuplicates.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No duplicate products found. All product entries are unique.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6">
            {activeDuplicates.map((group, groupIndex) => (
              <Card key={`${group.restaurantId}-${group.name}-${groupIndex}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      {group.name}
                    </CardTitle>
                    <Badge variant="outline">{group.restaurantName}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {group.items.filter(i => !deletedIds.has(i.id)).length} copies found — keep one and delete the rest
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500">
                          <th className="pb-2 pr-4">ID</th>
                          <th className="pb-2 pr-4">Category</th>
                          <th className="pb-2 pr-4">Segment</th>
                          <th className="pb-2 pr-4">Price</th>
                          <th className="pb-2 pr-4">MRP</th>
                          <th className="pb-2 pr-4">HSN</th>
                          <th className="pb-2 pr-4">Packaging</th>
                          <th className="pb-2 pr-4">Units/Pkg</th>
                          <th className="pb-2 pr-4">Available</th>
                          <th className="pb-2 pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items
                          .filter(item => !deletedIds.has(item.id))
                          .map((item, idx) => (
                          <tr key={item.id} className={`border-b last:border-0 ${idx === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                            <td className="py-2 pr-4 font-mono text-xs">{item.id}</td>
                            <td className="py-2 pr-4">{item.category}</td>
                            <td className="py-2 pr-4">
                              <Badge variant="secondary" className="text-xs">
                                {item.productSegment || '-'}
                              </Badge>
                            </td>
                            <td className="py-2 pr-4">₹{item.price}</td>
                            <td className="py-2 pr-4">₹{item.mrp}</td>
                            <td className="py-2 pr-4 text-xs">{item.hsnCode || '-'}</td>
                            <td className="py-2 pr-4 text-xs">{item.packagingType || '-'}</td>
                            <td className="py-2 pr-4 text-xs">{item.unitsPerPackage || '-'}</td>
                            <td className="py-2 pr-4">
                              <Badge variant={item.isAvailable ? 'default' : 'secondary'}>
                                {item.isAvailable ? 'Yes' : 'No'}
                              </Badge>
                            </td>
                            <td className="py-2 pr-4">
                              {idx === 0 ? (
                                <Badge className="bg-green-600">Keep</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteMutation.mutate(item.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
