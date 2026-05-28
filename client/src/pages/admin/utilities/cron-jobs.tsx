import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  ArrowLeft, 
  Play,
  Pause,
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  description: string;
}

export default function CronJobs() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJob, setNewJob] = useState({
    name: '',
    schedule: '',
    command: '',
    description: ''
  });

  // Mock cron jobs data
  const mockCronJobs: CronJob[] = [
    {
      id: '1',
      name: 'Database Backup',
      schedule: '0 2 * * *',
      command: 'php artisan backup:run',
      enabled: true,
      lastRun: '2025-01-15 02:00:00',
      nextRun: '2025-01-16 02:00:00',
      status: 'completed',
      description: 'Daily database backup'
    },
    {
      id: '2',
      name: 'Order Status Update',
      schedule: '*/5 * * * *',
      command: 'php artisan orders:update-status',
      enabled: true,
      lastRun: '2025-01-15 14:25:00',
      nextRun: '2025-01-15 14:30:00',
      status: 'running',
      description: 'Update order statuses every 5 minutes'
    },
    {
      id: '3',
      name: 'Email Queue Process',
      schedule: '* * * * *',
      command: 'php artisan queue:work --stop-when-empty',
      enabled: true,
      lastRun: '2025-01-15 14:29:00',
      nextRun: '2025-01-15 14:30:00',
      status: 'completed',
      description: 'Process email queue every minute'
    },
    {
      id: '4',
      name: 'Clean Temp Files',
      schedule: '0 0 * * 0',
      command: 'php artisan storage:cleanup',
      enabled: false,
      lastRun: '2025-01-08 00:00:00',
      nextRun: '2025-01-19 00:00:00',
      status: 'pending',
      description: 'Weekly cleanup of temporary files'
    },
    {
      id: '5',
      name: 'Generate Reports',
      schedule: '0 1 1 * *',
      command: 'php artisan reports:generate',
      enabled: true,
      lastRun: '2025-01-01 01:00:00',
      nextRun: '2025-02-01 01:00:00',
      status: 'failed',
      description: 'Generate monthly reports'
    }
  ];

  const { data: cronJobs = mockCronJobs } = useQuery({
    queryKey: ['/api/admin/cron-jobs'],
    initialData: mockCronJobs
  });

  const toggleJobMutation = useMutation({
    mutationFn: async ({ jobId, enabled }: { jobId: string; enabled: boolean }) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { jobId, enabled };
    },
    onSuccess: ({ jobId, enabled }) => {
      toast({
        title: enabled ? "Job Enabled" : "Job Disabled",
        description: "Cron job status updated successfully",
      });
    },
  });

  const runJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return jobId;
    },
    onSuccess: () => {
      toast({
        title: "Job Started",
        description: "Cron job executed successfully",
      });
    },
  });

  const addJobMutation = useMutation({
    mutationFn: async (job: typeof newJob) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return job;
    },
    onSuccess: () => {
      toast({
        title: "Job Added",
        description: "New cron job created successfully",
      });
      setNewJob({ name: '', schedule: '', command: '', description: '' });
      setShowAddForm(false);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running': return <Play className="h-4 w-4 text-blue-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
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
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-cron-jobs">
              Cron Jobs
            </h1>
            <p className="text-gray-600">Manage automated tasks and scheduled jobs</p>
          </div>
          <Button onClick={() => setShowAddForm(true)} data-testid="button-add-job">
            <Plus className="h-4 w-4 mr-2" />
            Add Job
          </Button>
        </div>

        {/* Add Job Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Cron Job</CardTitle>
              <CardDescription>Create a new scheduled task</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobName">Job Name</Label>
                  <Input
                    id="jobName"
                    value={newJob.name}
                    onChange={(e) => setNewJob(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Daily Backup"
                    data-testid="input-job-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobSchedule">Schedule (Cron)</Label>
                  <Input
                    id="jobSchedule"
                    value={newJob.schedule}
                    onChange={(e) => setNewJob(prev => ({ ...prev, schedule: e.target.value }))}
                    placeholder="e.g., 0 2 * * *"
                    data-testid="input-job-schedule"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobCommand">Command</Label>
                <Input
                  id="jobCommand"
                  value={newJob.command}
                  onChange={(e) => setNewJob(prev => ({ ...prev, command: e.target.value }))}
                  placeholder="e.g., php artisan backup:run"
                  data-testid="input-job-command"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Description</Label>
                <Input
                  id="jobDescription"
                  value={newJob.description}
                  onChange={(e) => setNewJob(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this job does"
                  data-testid="input-job-description"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => addJobMutation.mutate(newJob)}
                  disabled={!newJob.name || !newJob.schedule || !newJob.command || addJobMutation.isPending}
                  data-testid="button-save-job"
                >
                  {addJobMutation.isPending ? 'Adding...' : 'Add Job'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)} data-testid="button-cancel-add">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cron Jobs List */}
        <div className="space-y-4">
          {cronJobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(job.status)}
                      <h3 className="font-semibold" data-testid={`job-name-${job.id}`}>{job.name}</h3>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      <Switch
                        checked={job.enabled}
                        onCheckedChange={(enabled) => 
                          toggleJobMutation.mutate({ jobId: job.id, enabled })
                        }
                        data-testid={`switch-${job.id}`}
                      />
                    </div>
                    <p className="text-sm text-gray-600">{job.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Schedule:</span> {job.schedule}
                      </div>
                      <div>
                        <span className="font-medium">Last Run:</span> {job.lastRun || 'Never'}
                      </div>
                      <div>
                        <span className="font-medium">Next Run:</span> {job.nextRun}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Command:</span>{' '}
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                        {job.command}
                      </code>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runJobMutation.mutate(job.id)}
                      disabled={!job.enabled || runJobMutation.isPending}
                      data-testid={`button-run-${job.id}`}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-edit-${job.id}`}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-delete-${job.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}