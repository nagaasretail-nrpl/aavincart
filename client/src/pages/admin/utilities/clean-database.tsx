import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trash2, 
  ArrowLeft, 
  AlertTriangle,
  Database,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

interface CleanupOption {
  id: string;
  label: string;
  description: string;
  danger: boolean;
  estimatedRecords?: number;
}

export default function CleanDatabase() {
  const { toast } = useToast();
  const [cleanupProgress, setCleanupProgress] = useState(0);
  const [isCleaning, setIsCleaning] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  const cleanupOptions: CleanupOption[] = [
    {
      id: 'expired_sessions',
      label: 'Expired Sessions',
      description: 'Remove user sessions older than 30 days',
      danger: false,
      estimatedRecords: 1250
    },
    {
      id: 'old_logs',
      label: 'Old Log Entries',
      description: 'Remove log entries older than 90 days',
      danger: false,
      estimatedRecords: 8900
    },
    {
      id: 'temp_files',
      label: 'Temporary Files',
      description: 'Remove temporary upload files older than 7 days',
      danger: false,
      estimatedRecords: 340
    },
    {
      id: 'cancelled_orders',
      label: 'Cancelled Orders',
      description: 'Remove cancelled orders older than 1 year',
      danger: true,
      estimatedRecords: 450
    },
    {
      id: 'inactive_users',
      label: 'Inactive Users',
      description: 'Remove users who haven\'t logged in for 2+ years',
      danger: true,
      estimatedRecords: 120
    },
    {
      id: 'orphaned_media',
      label: 'Orphaned Media Files',
      description: 'Remove media files not linked to any records',
      danger: false,
      estimatedRecords: 89
    }
  ];

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      setIsCleaning(true);
      setCleanupProgress(0);
      
      // Simulate cleanup progress
      for (let i = 0; i <= 100; i += 5) {
        await new Promise(resolve => setTimeout(resolve, 150));
        setCleanupProgress(i);
      }
      
      setIsCleaning(false);
      return 'cleanup-completed';
    },
    onSuccess: () => {
      toast({
        title: "Cleanup Complete",
        description: `Successfully cleaned up ${selectedOptions.size} categories`,
      });
      setSelectedOptions(new Set());
    },
    onError: () => {
      setIsCleaning(false);
      toast({
        title: "Error",
        description: "Failed to cleanup database",
        variant: "destructive",
      });
    },
  });

  const handleOptionToggle = (optionId: string, checked: boolean) => {
    setSelectedOptions(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(optionId);
      } else {
        newSet.delete(optionId);
      }
      return newSet;
    });
  };

  const getTotalEstimatedRecords = () => {
    return cleanupOptions
      .filter(option => selectedOptions.has(option.id))
      .reduce((total, option) => total + (option.estimatedRecords || 0), 0);
  };

  const hasDangerousOptions = () => {
    return cleanupOptions
      .filter(option => selectedOptions.has(option.id))
      .some(option => option.danger);
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
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-clean-database">
              Clean Database
            </h1>
            <p className="text-gray-600">Remove unnecessary data and optimize database performance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Cleanup Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5" />
                  <span>Cleanup Options</span>
                </CardTitle>
                <CardDescription>Select the data categories you want to clean up</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {cleanupOptions.map((option) => (
                  <div 
                    key={option.id} 
                    className={`border rounded-lg p-4 ${option.danger ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'}`}
                    data-testid={`cleanup-option-${option.id}`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={option.id}
                        checked={selectedOptions.has(option.id)}
                        onCheckedChange={(checked) => handleOptionToggle(option.id, !!checked)}
                        data-testid={`checkbox-${option.id}`}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <label 
                            htmlFor={option.id} 
                            className="font-medium cursor-pointer"
                          >
                            {option.label}
                          </label>
                          {option.danger && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{option.description}</p>
                        <p className="text-xs text-gray-500">
                          Estimated records: {option.estimatedRecords?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cleanup Progress */}
            {isCleaning && (
              <Card>
                <CardHeader>
                  <CardTitle>Cleanup in Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cleaning database...</span>
                      <span>{cleanupProgress}%</span>
                    </div>
                    <Progress value={cleanupProgress} className="w-full" data-testid="progress-cleanup" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cleanup Summary */}
            {selectedOptions.size > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Cleanup Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <p><strong>Selected categories:</strong> {selectedOptions.size}</p>
                    <p><strong>Estimated records to remove:</strong> {getTotalEstimatedRecords().toLocaleString()}</p>
                  </div>

                  {hasDangerousOptions() && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        You have selected potentially dangerous cleanup options. This action cannot be undone.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={() => cleanupMutation.mutate()}
                    disabled={isCleaning || selectedOptions.size === 0}
                    variant={hasDangerousOptions() ? "destructive" : "default"}
                    className="w-full"
                    data-testid="button-start-cleanup"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isCleaning ? 'Cleaning...' : 'Start Cleanup'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Safety Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Always create a database backup before performing cleanup operations.
                  </AlertDescription>
                </Alert>
                
                <div className="text-sm space-y-2">
                  <h4 className="font-medium">Cleanup Benefits:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Improved database performance</li>
                    <li>• Reduced storage usage</li>
                    <li>• Faster query execution</li>
                    <li>• Better backup times</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Last Cleanup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>15 days ago</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Removed 2,340 records
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}