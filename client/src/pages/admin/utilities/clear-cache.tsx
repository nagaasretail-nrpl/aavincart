import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  X, 
  ArrowLeft, 
  RefreshCw,
  HardDrive,
  Image,
  Database,
  Zap,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

interface CacheType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  size: string;
  lastCleared: string;
  status: 'healthy' | 'warning' | 'critical';
}

export default function ClearCache() {
  const { toast } = useToast();
  const [clearProgress, setClearProgress] = useState<Record<string, number>>({});
  const [clearingCaches, setClearingCaches] = useState<Set<string>>(new Set());

  const cacheTypes: CacheType[] = [
    {
      id: 'application',
      name: 'Application Cache',
      description: 'Cached application data, configurations, and computed values',
      icon: <Zap className="h-5 w-5" />,
      size: '245 MB',
      lastCleared: '2 hours ago',
      status: 'healthy'
    },
    {
      id: 'database',
      name: 'Database Query Cache',
      description: 'Cached database query results and connection pools',
      icon: <Database className="h-5 w-5" />,
      size: '128 MB',
      lastCleared: '1 day ago',
      status: 'warning'
    },
    {
      id: 'images',
      name: 'Image Cache',
      description: 'Cached thumbnails, resized images, and processed media',
      icon: <Image className="h-5 w-5" />,
      size: '892 MB',
      lastCleared: '3 days ago',
      status: 'critical'
    },
    {
      id: 'sessions',
      name: 'Session Cache',
      description: 'User sessions, authentication tokens, and temporary data',
      icon: <HardDrive className="h-5 w-5" />,
      size: '67 MB',
      lastCleared: '6 hours ago',
      status: 'healthy'
    },
    {
      id: 'views',
      name: 'View Cache',
      description: 'Compiled templates, rendered pages, and static assets',
      icon: <RefreshCw className="h-5 w-5" />,
      size: '156 MB',
      lastCleared: '4 hours ago',
      status: 'healthy'
    },
    {
      id: 'api',
      name: 'API Response Cache',
      description: 'Cached API responses and third-party service calls',
      icon: <Zap className="h-5 w-5" />,
      size: '89 MB',
      lastCleared: '2 days ago',
      status: 'warning'
    }
  ];

  const clearCacheMutation = useMutation({
    mutationFn: async (cacheId: string) => {
      setClearingCaches(prev => new Set(prev).add(cacheId));
      setClearProgress(prev => ({ ...prev, [cacheId]: 0 }));
      
      // Simulate cache clearing progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setClearProgress(prev => ({ ...prev, [cacheId]: i }));
      }
      
      setClearingCaches(prev => {
        const newSet = new Set(prev);
        newSet.delete(cacheId);
        return newSet;
      });
      
      return cacheId;
    },
    onSuccess: (cacheId) => {
      const cacheType = cacheTypes.find(c => c.id === cacheId);
      toast({
        title: "Cache Cleared",
        description: `${cacheType?.name} has been cleared successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear cache",
        variant: "destructive",
      });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      // Clear all caches sequentially
      for (const cache of cacheTypes) {
        await clearCacheMutation.mutateAsync(cache.id);
      }
      return 'all-cleared';
    },
    onSuccess: () => {
      toast({
        title: "All Caches Cleared",
        description: "All cache types have been cleared successfully",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <X className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTotalSize = () => {
    return cacheTypes.reduce((total, cache) => {
      const size = parseFloat(cache.size.replace(/[^\d.]/g, ''));
      return total + size;
    }, 0).toFixed(0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/utilities">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Utilities
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-clear-cache">
              Clear Cache
            </h1>
            <p className="text-gray-600">Manage and clear application caches to improve performance</p>
          </div>
          <Button 
            onClick={() => clearAllMutation.mutate()}
            disabled={clearAllMutation.isPending || clearingCaches.size > 0}
            variant="destructive"
            data-testid="button-clear-all"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Caches
          </Button>
        </div>

        {/* Cache Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cache Size</p>
                  <p className="text-2xl font-bold">{getTotalSize()} MB</p>
                </div>
                <HardDrive className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cache Types</p>
                  <p className="text-2xl font-bold">{cacheTypes.length}</p>
                </div>
                <Database className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Healthy</p>
                  <p className="text-2xl font-bold text-green-600">
                    {cacheTypes.filter(c => c.status === 'healthy').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Need Attention</p>
                  <p className="text-2xl font-bold text-red-600">
                    {cacheTypes.filter(c => c.status === 'critical' || c.status === 'warning').length}
                  </p>
                </div>
                <X className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cache Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cacheTypes.map((cache) => {
            const isClearing = clearingCaches.has(cache.id);
            const progress = clearProgress[cache.id] || 0;
            
            return (
              <Card key={cache.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {cache.icon}
                      <span>{cache.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(cache.status)}
                      <Badge className={getStatusColor(cache.status)}>
                        {cache.status}
                      </Badge>
                    </div>
                  </CardTitle>
                  <CardDescription>{cache.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Size: <strong>{cache.size}</strong></span>
                    <span>Last cleared: <strong>{cache.lastCleared}</strong></span>
                  </div>
                  
                  {isClearing && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Clearing cache...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="w-full" data-testid={`progress-${cache.id}`} />
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => clearCacheMutation.mutate(cache.id)}
                    disabled={isClearing}
                    className="w-full"
                    variant={cache.status === 'critical' ? 'destructive' : 'default'}
                    data-testid={`button-clear-${cache.id}`}
                  >
                    <X className="h-4 w-4 mr-2" />
                    {isClearing ? 'Clearing...' : 'Clear Cache'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Alert */}
        <Alert>
          <RefreshCw className="h-4 w-4" />
          <AlertDescription>
            Clearing caches may temporarily slow down your application while data is rebuilt. 
            Consider clearing caches during low-traffic periods for the best user experience.
          </AlertDescription>
        </Alert>
      </div>
    </AdminLayout>
  );
}