import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { formatTimestamp } from '@/lib/format-timestamp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Package, ArrowLeft, Search, Download, Settings, Trash2, Plus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

interface Addon {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'active' | 'inactive' | 'error';
  author: string;
  category: string;
  installDate?: Date;
  updateAvailable: boolean;
}

const defaultAddons: Addon[] = [
  {
    id: '1',
    name: 'Payment Gateway Pro',
    description: 'Advanced payment processing with multiple gateways',
    version: '2.1.0',
    status: 'active',
    author: 'PaymentSoft',
    category: 'Payment',
    installDate: new Date('2024-01-10'),
    updateAvailable: true,
  },
  {
    id: '2',
    name: 'SMS Notifications',
    description: 'Send SMS notifications to customers and unions',
    version: '1.5.3',
    status: 'active',
    author: 'NotifyLab',
    category: 'Communication',
    installDate: new Date('2024-01-12'),
    updateAvailable: false,
  },
  {
    id: '3',
    name: 'Advanced Analytics',
    description: 'Detailed analytics and reporting dashboard',
    version: '3.0.2',
    status: 'inactive',
    author: 'AnalyticsPro',
    category: 'Analytics',
    installDate: new Date('2024-01-15'),
    updateAvailable: false,
  },
];

export default function AddonManager() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showInstallForm, setShowInstallForm] = useState(false);
  const [addonUrl, setAddonUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [addons, setAddons] = useState<Addon[]>(defaultAddons);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAddonUrl('');
    }
  };

  const toggleAddonMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { id, status };
    },
    onSuccess: ({ id, status }) => {
      setAddons(prev => prev.map(addon => 
        addon.id === id ? { ...addon, status: status as 'active' | 'inactive' | 'error' } : addon
      ));
      toast({
        title: "Success",
        description: "Addon status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update addon status",
        variant: "destructive",
      });
    },
  });

  const uninstallAddonMutation = useMutation({
    mutationFn: async (addonId: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return addonId;
    },
    onSuccess: (addonId) => {
      setAddons(prev => prev.filter(addon => addon.id !== addonId));
      toast({
        title: "Success",
        description: "Addon uninstalled successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to uninstall addon",
        variant: "destructive",
      });
    },
  });

  const installAddonMutation = useMutation({
    mutationFn: async ({ url, file }: { url?: string; file?: File }) => {
      if (!url?.trim() && !file) {
        throw new Error('Please enter a valid addon URL or upload a file');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fileName = file ? file.name : (url || 'Unknown');
      const addonName = fileName.replace(/\.zip$/i, '').replace(/[-_]/g, ' ');
      
      const newAddon: Addon = {
        id: Date.now().toString(),
        name: addonName,
        description: `Installed from ${fileName}`,
        version: '1.0.0',
        status: 'active',
        author: 'Custom',
        category: 'Custom',
        installDate: new Date(),
        updateAvailable: false,
      };
      
      return { success: true, addon: newAddon, source: fileName };
    },
    onSuccess: (data) => {
      setAddons(prev => [...prev, data.addon]);
      toast({
        title: "Success",
        description: `Addon "${data.addon.name}" installed successfully`,
      });
      setShowInstallForm(false);
      setAddonUrl('');
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to install addon",
        variant: "destructive",
      });
    },
  });

  const filteredAddons = addons.filter((addon: Addon) =>
    addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addon.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addon.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, color: 'text-green-600' },
      inactive: { variant: 'secondary' as const, color: 'text-gray-600' },
      error: { variant: 'destructive' as const, color: 'text-red-600' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    return <Badge variant={config.variant}>{status}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    return <Badge variant="outline">{category}</Badge>;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-addon-manager">
              Addon Manager
            </h1>
            <p className="text-gray-600">Install and manage platform addons and extensions</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Installed Addons</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={() => setShowInstallForm(!showInstallForm)} data-testid="button-install-addon">
                  <Upload className="h-4 w-4 mr-2" />
                  Install/Update Addon
                </Button>
              </div>
            </CardTitle>
            <CardDescription>Manage your installed addons and extensions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search addons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-addons"
              />
            </div>
            
            {showInstallForm && (
              <div className="border rounded-lg p-4 bg-orange-50 border-orange-200">
                <h3 className="font-medium mb-3 text-gray-800">Install/Update Addon</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Locate the addon module zip file (e.g., SingleModules.zip) and upload it below.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <label className="cursor-pointer flex-1">
                      <input
                        type="file"
                        accept=".zip"
                        className="hidden"
                        onChange={handleFileSelect}
                        data-testid="input-file-upload"
                      />
                      <div 
                        className="border-2 border-dashed border-orange-300 rounded-lg p-4 text-center hover:border-orange-400 hover:bg-orange-100 transition-colors cursor-pointer"
                        onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
                          input?.click();
                        }}
                        data-testid="dropzone-addon"
                      >
                        {selectedFile ? (
                          <div className="flex items-center justify-center space-x-2 text-orange-700">
                            <Package className="h-5 w-5" />
                            <span className="font-medium" data-testid="text-selected-file">{selectedFile.name}</span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-500 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                              }}
                              data-testid="button-clear-file"
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-orange-400" />
                            <p className="font-medium">Click to select addon zip file</p>
                            <p className="text-xs text-gray-400 mt-1">Accepts .zip files only</p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Button 
                      className="bg-orange-500 hover:bg-orange-600"
                      data-testid="button-upload-addon"
                      onClick={() => installAddonMutation.mutate({ url: addonUrl, file: selectedFile || undefined })}
                      disabled={installAddonMutation.isPending || !selectedFile}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {installAddonMutation.isPending ? 'Installing...' : 'Install/Update'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowInstallForm(false);
                        setAddonUrl('');
                        setSelectedFile(null);
                      }} 
                      data-testid="button-cancel-install"
                      disabled={installAddonMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Install Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAddons.map((addon: Addon) => (
                  <TableRow key={addon.id} data-testid={`row-addon-${addon.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center space-x-2" data-testid={`text-addon-name-${addon.id}`}>
                          <span>{addon.name}</span>
                          {addon.updateAvailable && (
                            <Badge variant="outline" className="text-xs">Update Available</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500" data-testid={`text-addon-description-${addon.id}`}>
                          {addon.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-version-${addon.id}`}>
                      {addon.version}
                    </TableCell>
                    <TableCell data-testid={`category-${addon.id}`}>
                      {getCategoryBadge(addon.category)}
                    </TableCell>
                    <TableCell data-testid={`status-${addon.id}`}>
                      {getStatusBadge(addon.status)}
                    </TableCell>
                    <TableCell data-testid={`text-author-${addon.id}`}>
                      {addon.author}
                    </TableCell>
                    <TableCell data-testid={`text-install-date-${addon.id}`}>
                      {formatTimestamp(addon.installDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={addon.status === 'active'}
                          onCheckedChange={(checked) => 
                            toggleAddonMutation.mutate({ 
                              id: addon.id, 
                              status: checked ? 'active' : 'inactive' 
                            })
                          }
                          data-testid={`switch-addon-${addon.id}`}
                        />
                        <Button variant="outline" size="sm" data-testid={`button-settings-${addon.id}`}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => uninstallAddonMutation.mutate(addon.id)}
                          disabled={uninstallAddonMutation.isPending}
                          data-testid={`button-uninstall-${addon.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredAddons.length === 0 && (
              <div className="text-center py-8" data-testid="no-addons-message">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchQuery ? 'No addons found matching your criteria.' : 'No addons installed.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}