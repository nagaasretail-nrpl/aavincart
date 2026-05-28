import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { MessageCircle, ArrowLeft, Send, Mail, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from './layout';

export default function Communication() {
  const { toast } = useToast();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return messageData;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
      setMessage('');
      setSubject('');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Message content is required",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate({ subject, message });
  };

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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-communication">
              Communication
            </h1>
            <p className="text-gray-600">Send messages and manage communication channels</p>
          </div>
        </div>

        <Tabs defaultValue="broadcast" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
            <TabsTrigger value="broadcast">Broadcast Message</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">Message History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="broadcast" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Send Broadcast Message</span>
                </CardTitle>
                <CardDescription>Send messages to all unions or customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter message subject"
                    data-testid="input-subject"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={6}
                    data-testid="textarea-message"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Recipients: All active users
                  </div>
                  <Button 
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Communication Channels</CardTitle>
                <CardDescription>Configure available communication channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={emailEnabled}
                    onCheckedChange={setEmailEnabled}
                    data-testid="switch-email-enabled"
                  />
                  <Mail className="h-4 w-4" />
                  <Label>Email Notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={smsEnabled}
                    onCheckedChange={setSmsEnabled}
                    data-testid="switch-sms-enabled"
                  />
                  <MessageSquare className="h-4 w-4" />
                  <Label>SMS Notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={setPushEnabled}
                    data-testid="switch-push-enabled"
                  />
                  <MessageCircle className="h-4 w-4" />
                  <Label>Push Notifications</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Message History</CardTitle>
                <CardDescription>View previously sent messages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8" data-testid="no-messages">
                  <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No messages sent yet</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}