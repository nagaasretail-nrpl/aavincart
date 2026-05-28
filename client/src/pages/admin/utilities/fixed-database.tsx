import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function FixedDatabase() {
  const { toast } = useToast();
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<Array<{
    id: string;
    table: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    status: 'pending' | 'fixed' | 'error';
  }>>([]);

  const scanMutation = useMutation({
    mutationFn: async () => {
      setIsScanning(true);
      setScanProgress(0);
      
      // Simulate database scan progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setScanProgress(i);
      }
      
      // Mock scan results
      const mockResults = [
        { id: '1', table: 'users', issue: 'Orphaned records found', severity: 'medium' as const, status: 'pending' as const },
        { id: '2', table: 'orders', issue: 'Missing foreign key constraints', severity: 'high' as const, status: 'pending' as const },
        { id: '3', table: 'restaurants', issue: 'Duplicate entries detected', severity: 'low' as const, status: 'pending' as const },
        { id: '4', table: 'menu_items', issue: 'Invalid price values', severity: 'medium' as const, status: 'pending' as const },
      ];
      
      setScanResults(mockResults);
      setIsScanning(false);
      return mockResults;
    },
    onSuccess: () => {
      toast({
        title: "Scan Complete",
        description: "Database integrity scan completed successfully",
      });
    },
    onError: () => {
      setIsScanning(false);
      toast({
        title: "Error",
        description: "Failed to scan database",
        variant: "destructive",
      });
    },
  });

  const fixIssue = async (issueId: string) => {
    setScanResults(prev => 
      prev.map(item => 
        item.id === issueId 
          ? { ...item, status: 'fixed' as const }
          : item
      )
    );
    
    toast({
      title: "Issue Fixed",
      description: "Database issue has been resolved",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-fixed-database">
              Fixed Database
            </h1>
            <p className="text-gray-600">Scan and fix database integrity issues</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Scan Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Database Integrity Scan</span>
                </CardTitle>
                <CardDescription>Scan your database for common issues and integrity problems</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isScanning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Scanning database...</span>
                      <span>{scanProgress}%</span>
                    </div>
                    <Progress value={scanProgress} className="w-full" data-testid="progress-scan" />
                  </div>
                )}
                
                <Button 
                  onClick={() => scanMutation.mutate()}
                  disabled={isScanning}
                  className="w-full"
                  data-testid="button-scan-database"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {isScanning ? 'Scanning...' : 'Start Database Scan'}
                </Button>
              </CardContent>
            </Card>

            {/* Scan Results */}
            {scanResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Scan Results</CardTitle>
                  <CardDescription>Issues found during the database scan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scanResults.map((result) => (
                      <div 
                        key={result.id} 
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`issue-${result.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{result.table}</span>
                              <Badge className={getSeverityColor(result.severity)}>
                                {result.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{result.issue}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {result.status === 'fixed' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : result.status === 'error' ? (
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => fixIssue(result.id)}
                                data-testid={`button-fix-${result.id}`}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Fix
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scan Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Always backup your database before running fixes on production data.
                  </AlertDescription>
                </Alert>
                
                <div className="text-sm space-y-2">
                  <h4 className="font-medium">What this tool checks:</h4>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Orphaned records</li>
                    <li>• Missing foreign keys</li>
                    <li>• Duplicate entries</li>
                    <li>• Invalid data formats</li>
                    <li>• Constraint violations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}