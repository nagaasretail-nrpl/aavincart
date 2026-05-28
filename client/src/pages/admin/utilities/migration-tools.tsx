import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw, 
  ArrowLeft, 
  Upload,
  Download,
  Database,
  AlertTriangle,
  CheckCircle,
  History,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

interface Migration {
  id: string;
  name: string;
  version: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description: string;
  createdAt: string;
}

export default function MigrationTools() {
  const { toast } = useToast();
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [migrationScript, setMigrationScript] = useState('');

  // Mock migrations data
  const mockMigrations: Migration[] = [
    {
      id: '1',
      name: 'Add delivery tracking table',
      version: '2025_01_15_140000',
      status: 'completed',
      description: 'Create table for tracking delivery status and location',
      createdAt: '2025-01-15 14:00:00'
    },
    {
      id: '2', 
      name: 'Update user preferences schema',
      version: '2025_01_10_120000',
      status: 'completed',
      description: 'Add columns for notification preferences and themes',
      createdAt: '2025-01-10 12:00:00'
    },
    {
      id: '3',
      name: 'Union rating system',
      version: '2025_01_05_090000',
      status: 'completed',
      description: 'Add rating and review tables for district unions',
      createdAt: '2025-01-05 09:00:00'
    },
    {
      id: '4',
      name: 'Payment gateway integration',
      version: '2025_01_01_160000',
      status: 'failed',
      description: 'Add payment processing tables and foreign keys',
      createdAt: '2025-01-01 16:00:00'
    }
  ];

  const [migrations] = useState<Migration[]>(mockMigrations);

  const runMigrationMutation = useMutation({
    mutationFn: async () => {
      setIsMigrating(true);
      setMigrationProgress(0);
      
      // Simulate migration progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setMigrationProgress(i);
      }
      
      setIsMigrating(false);
      return 'migration-completed';
    },
    onSuccess: () => {
      toast({
        title: "Migration Complete",
        description: "Database migration executed successfully",
      });
    },
    onError: () => {
      setIsMigrating(false);
      toast({
        title: "Migration Failed",
        description: "Failed to execute database migration",
        variant: "destructive",
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (migrationId: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return migrationId;
    },
    onSuccess: () => {
      toast({
        title: "Rollback Complete",
        description: "Migration rolled back successfully",
      });
    },
    onError: () => {
      toast({
        title: "Rollback Failed",
        description: "Failed to rollback migration",
        variant: "destructive",
      });
    },
  });

  const exportMigrationMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return 'export-completed';
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Migration schema exported successfully",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <History className="h-4 w-4 text-gray-600" />;
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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-migration-tools">
              Migration Tools
            </h1>
            <p className="text-gray-600">Manage database migrations and schema changes</p>
          </div>
        </div>

        <Tabs defaultValue="run" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="run">Run Migrations</TabsTrigger>
            <TabsTrigger value="history">Migration History</TabsTrigger>
            <TabsTrigger value="create">Create Migration</TabsTrigger>
            <TabsTrigger value="export">Export/Import</TabsTrigger>
          </TabsList>
          
          <TabsContent value="run" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RefreshCw className="h-5 w-5" />
                    <span>Run Pending Migrations</span>
                  </CardTitle>
                  <CardDescription>Execute all pending database migrations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isMigrating && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Running migrations...</span>
                        <span>{migrationProgress}%</span>
                      </div>
                      <Progress value={migrationProgress} className="w-full" data-testid="progress-migration" />
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => runMigrationMutation.mutate()}
                    disabled={isMigrating}
                    className="w-full"
                    data-testid="button-run-migrations"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {isMigrating ? 'Running Migrations...' : 'Run All Pending'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Migration Status</CardTitle>
                  <CardDescription>Current database migration status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pending migrations:</span>
                      <span className="font-medium">2</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Completed migrations:</span>
                      <span className="font-medium">18</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Database version:</span>
                      <span className="font-medium">2025_01_15_140000</span>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Always backup your database before running migrations on production.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Migration History</CardTitle>
                <CardDescription>View all database migrations and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {migrations.map((migration) => (
                    <div 
                      key={migration.id} 
                      className="border rounded-lg p-4 space-y-3"
                      data-testid={`migration-${migration.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(migration.status)}
                            <span className="font-medium">{migration.name}</span>
                            <Badge className={getStatusColor(migration.status)}>
                              {migration.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{migration.description}</p>
                          <div className="text-xs text-gray-500">
                            Version: {migration.version} | Created: {migration.createdAt}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {migration.status === 'completed' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => rollbackMutation.mutate(migration.id)}
                              disabled={rollbackMutation.isPending}
                              data-testid={`button-rollback-${migration.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Rollback
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Migration</CardTitle>
                <CardDescription>Generate a new database migration file</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="migrationName">Migration Name</Label>
                  <Input
                    id="migrationName"
                    placeholder="e.g., add_delivery_tracking_table"
                    data-testid="input-migration-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="migrationScript">Migration Script</Label>
                  <Textarea
                    id="migrationScript"
                    value={migrationScript}
                    onChange={(e) => setMigrationScript(e.target.value)}
                    placeholder="-- SQL migration script&#10;CREATE TABLE delivery_tracking (&#10;    id SERIAL PRIMARY KEY,&#10;    order_id INTEGER NOT NULL,&#10;    status VARCHAR(50),&#10;    location TEXT,&#10;    updated_at TIMESTAMP DEFAULT NOW()&#10;);"
                    rows={8}
                    className="font-mono text-sm"
                    data-testid="textarea-migration-script"
                  />
                </div>
                
                <Button className="w-full" data-testid="button-create-migration">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Migration
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="export" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Download className="h-5 w-5" />
                    <span>Export Schema</span>
                  </CardTitle>
                  <CardDescription>Export current database schema and migrations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={() => exportMigrationMutation.mutate()}
                    disabled={exportMigrationMutation.isPending}
                    className="w-full"
                    data-testid="button-export-schema"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {exportMigrationMutation.isPending ? 'Exporting...' : 'Export Schema'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5" />
                    <span>Import Schema</span>
                  </CardTitle>
                  <CardDescription>Import database schema from file</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="schemaFile">Schema File</Label>
                    <Input
                      id="schemaFile"
                      type="file"
                      accept=".sql,.json"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      data-testid="input-schema-file"
                    />
                  </div>
                  
                  <Button 
                    disabled={!selectedFile}
                    className="w-full"
                    variant="destructive"
                    data-testid="button-import-schema"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Schema
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}