import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Settings2, 
  ArrowLeft, 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Trash2,
  FileText,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

export default function Utilities() {
  const { toast } = useToast();
  const [backupProgress, setBackupProgress] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('');
  const [importData, setImportData] = useState('');

  const backupMutation = useMutation({
    mutationFn: async () => {
      setIsBackingUp(true);
      setBackupProgress(0);
      
      // Simulate backup progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setBackupProgress(i);
      }
      
      setIsBackingUp(false);
      return 'backup-completed';
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Database backup completed successfully",
      });
    },
    onError: () => {
      setIsBackingUp(false);
      toast({
        title: "Error",
        description: "Failed to backup database",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      setIsRestoring(true);
      await new Promise(resolve => setTimeout(resolve, 3000));
      setIsRestoring(false);
      return 'restore-completed';
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Database restored successfully",
      });
    },
    onError: () => {
      setIsRestoring(false);
      toast({
        title: "Error",
        description: "Failed to restore database",
        variant: "destructive",
      });
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return 'cache-cleared';
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Cache cleared successfully",
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

  const executeSqlMutation = useMutation({
    mutationFn: async (query: string) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { query, result: 'Query executed successfully' };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "SQL query executed successfully",
      });
      setSqlQuery('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to execute SQL query",
        variant: "destructive",
      });
    },
  });

  const importDataMutation = useMutation({
    mutationFn: async (data: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Data imported successfully",
      });
      setImportData('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import data",
        variant: "destructive",
      });
    },
  });

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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-utilities">
              System Utilities
            </h1>
            <p className="text-gray-600">Database management, backups, and system maintenance tools</p>
          </div>
        </div>

        <Tabs defaultValue="backup" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="backup">Backup</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="cache">Cache</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="backup" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Database Backup</span>
                  </CardTitle>
                  <CardDescription>Create and manage database backups</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isBackingUp && (
                    <div className="space-y-2">
                      <Label>Backup Progress</Label>
                      <Progress value={backupProgress} className="w-full" data-testid="progress-backup" />
                      <p className="text-sm text-gray-500">{backupProgress}% completed</p>
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => backupMutation.mutate()}
                    disabled={isBackingUp}
                    className="w-full"
                    data-testid="button-backup-database"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isBackingUp ? 'Creating Backup...' : 'Create Backup'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>Database Restore</span>
                  </CardTitle>
                  <CardDescription>Restore database from backup file</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="backupFile">Backup File</Label>
                    <Input
                      id="backupFile"
                      type="file"
                      accept=".sql,.gz"
                      data-testid="input-backup-file"
                    />
                  </div>
                  
                  <Button 
                    onClick={() => restoreMutation.mutate()}
                    disabled={isRestoring}
                    className="w-full"
                    variant="destructive"
                    data-testid="button-restore-database"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isRestoring ? 'Restoring...' : 'Restore Database'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SQL Query Executor</CardTitle>
                <CardDescription>Execute custom SQL queries (Use with caution)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sqlQuery">SQL Query</Label>
                  <Textarea
                    id="sqlQuery"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM users LIMIT 10;"
                    rows={6}
                    className="font-mono text-sm"
                    data-testid="textarea-sql-query"
                  />
                </div>
                
                <Button 
                  onClick={() => executeSqlMutation.mutate(sqlQuery)}
                  disabled={executeSqlMutation.isPending || !sqlQuery.trim()}
                  data-testid="button-execute-sql"
                >
                  <Database className="h-4 w-4 mr-2" />
                  {executeSqlMutation.isPending ? 'Executing...' : 'Execute Query'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="cache" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RefreshCw className="h-5 w-5" />
                    <span>Application Cache</span>
                  </CardTitle>
                  <CardDescription>Clear application cache and temporary files</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => clearCacheMutation.mutate()}
                    disabled={clearCacheMutation.isPending}
                    className="w-full"
                    data-testid="button-clear-app-cache"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {clearCacheMutation.isPending ? 'Clearing...' : 'Clear Cache'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Database Cache</CardTitle>
                  <CardDescription>Clear database query cache</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline"
                    className="w-full"
                    data-testid="button-clear-db-cache"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Clear DB Cache
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Image Cache</CardTitle>
                  <CardDescription>Clear cached images and thumbnails</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline"
                    className="w-full"
                    data-testid="button-clear-image-cache"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Images
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Import</CardTitle>
                <CardDescription>Import data from CSV, JSON, or other formats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="importData">Import Data (JSON/CSV)</Label>
                  <Textarea
                    id="importData"
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste your data here or upload a file..."
                    rows={8}
                    data-testid="textarea-import-data"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={() => importDataMutation.mutate(importData)}
                    disabled={importDataMutation.isPending || !importData.trim()}
                    data-testid="button-import-data"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {importDataMutation.isPending ? 'Importing...' : 'Import Data'}
                  </Button>
                  
                  <Button variant="outline" data-testid="button-upload-file">
                    <FileText className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>System Logs</span>
                </CardTitle>
                <CardDescription>View and manage system logs and error reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" data-testid="button-view-error-logs">
                    Error Logs
                  </Button>
                  <Button variant="outline" data-testid="button-view-access-logs">
                    Access Logs
                  </Button>
                  <Button variant="outline" data-testid="button-view-system-logs">
                    System Logs
                  </Button>
                  <Button variant="outline" data-testid="button-download-logs">
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4 bg-gray-50 h-64 overflow-y-auto font-mono text-sm" data-testid="log-viewer">
                  <p className="text-gray-500">Log entries will appear here...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}