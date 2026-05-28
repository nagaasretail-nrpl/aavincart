import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageCircle, 
  ArrowLeft, 
  Save, 
  MessageSquare,
  Bell,
  Clock,
  Users,
  Shield,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import AdminLayout from '../layout';

export default function ChatSettings() {
  const { toast } = useToast();
  
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatDeletionEnabled, setChatDeletionEnabled] = useState(true);
  const [orderChatEnabled, setOrderChatEnabled] = useState(true);
  const [supportChatEnabled, setSupportChatEnabled] = useState(true);
  const [unionChatEnabled, setUnionChatEnabled] = useState(true);
  const [fileSharing, setFileSharing] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(true);
  const [autoResponse, setAutoResponse] = useState(false);
  const [autoResponseMessage, setAutoResponseMessage] = useState('Thank you for your message. Our team will respond shortly.');
  const [chatRetentionDays, setChatRetentionDays] = useState('90');
  const [maxFileSize, setMaxFileSize] = useState('10');
  const [notifyNewChat, setNotifyNewChat] = useState(true);
  const [offlineMessage, setOfflineMessage] = useState('Our support team is currently offline. Please leave a message and we will get back to you during business hours.');

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return settings;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Chat settings saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save chat settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate({ 
      chatEnabled, 
      chatDeletionEnabled,
      orderChatEnabled,
      supportChatEnabled,
      unionChatEnabled,
      fileSharing,
      readReceipts,
      typingIndicator,
      autoResponse,
      autoResponseMessage,
      chatRetentionDays,
      maxFileSize,
      notifyNewChat,
      offlineMessage
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/communication">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Communication
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-chat-settings">
              Chat Settings
            </h1>
            <p className="text-gray-600">Configure chat features for B2B communication between unions and dealers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5" />
                <span>Chat Configuration</span>
              </CardTitle>
              <CardDescription>Enable or disable chat features across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled chat</Label>
                  <p className="text-sm text-gray-500">Allow users to send messages</p>
                </div>
                <Switch
                  checked={chatEnabled}
                  onCheckedChange={setChatEnabled}
                  data-testid="switch-chat-enabled"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enabled chat deletion</Label>
                  <p className="text-sm text-gray-500">Allow users to delete their messages</p>
                </div>
                <Switch
                  checked={chatDeletionEnabled}
                  onCheckedChange={setChatDeletionEnabled}
                  data-testid="switch-chat-deletion"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Order Chat</Label>
                  <p className="text-sm text-gray-500">Chat related to specific orders</p>
                </div>
                <Switch
                  checked={orderChatEnabled}
                  onCheckedChange={setOrderChatEnabled}
                  data-testid="switch-order-chat"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Support Chat</Label>
                  <p className="text-sm text-gray-500">Customer support conversations</p>
                </div>
                <Switch
                  checked={supportChatEnabled}
                  onCheckedChange={setSupportChatEnabled}
                  data-testid="switch-support-chat"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Union-to-Union Chat</Label>
                  <p className="text-sm text-gray-500">Allow district unions to communicate</p>
                </div>
                <Switch
                  checked={unionChatEnabled}
                  onCheckedChange={setUnionChatEnabled}
                  data-testid="switch-union-chat"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Chat Features</span>
              </CardTitle>
              <CardDescription>Configure additional chat functionality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>File Sharing</Label>
                  <p className="text-sm text-gray-500">Allow users to share files and images</p>
                </div>
                <Switch
                  checked={fileSharing}
                  onCheckedChange={setFileSharing}
                  data-testid="switch-file-sharing"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Read Receipts</Label>
                  <p className="text-sm text-gray-500">Show when messages are read</p>
                </div>
                <Switch
                  checked={readReceipts}
                  onCheckedChange={setReadReceipts}
                  data-testid="switch-read-receipts"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Typing Indicator</Label>
                  <p className="text-sm text-gray-500">Show when someone is typing</p>
                </div>
                <Switch
                  checked={typingIndicator}
                  onCheckedChange={setTypingIndicator}
                  data-testid="switch-typing-indicator"
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="max-file-size">Maximum File Size (MB)</Label>
                <Input 
                  id="max-file-size"
                  type="number"
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(e.target.value)}
                  className="w-32"
                  data-testid="input-max-file-size"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Auto Response</span>
              </CardTitle>
              <CardDescription>Configure automatic responses when support is unavailable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Auto Response</Label>
                  <p className="text-sm text-gray-500">Send automatic replies to new messages</p>
                </div>
                <Switch
                  checked={autoResponse}
                  onCheckedChange={setAutoResponse}
                  data-testid="switch-auto-response"
                />
              </div>
              
              {autoResponse && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="auto-response-message">Auto Response Message</Label>
                    <Textarea
                      id="auto-response-message"
                      value={autoResponseMessage}
                      onChange={(e) => setAutoResponseMessage(e.target.value)}
                      rows={3}
                      data-testid="textarea-auto-response"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="offline-message">Offline Message</Label>
                    <Textarea
                      id="offline-message"
                      value={offlineMessage}
                      onChange={(e) => setOfflineMessage(e.target.value)}
                      rows={3}
                      placeholder="Message shown when support is offline"
                      data-testid="textarea-offline-message"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Data Retention & Notifications</span>
              </CardTitle>
              <CardDescription>Manage chat data and notification settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="retention-days">Chat History Retention (Days)</Label>
                <Select value={chatRetentionDays} onValueChange={setChatRetentionDays}>
                  <SelectTrigger className="w-48" data-testid="select-retention-days">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">How long to keep chat messages</p>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New Chat Notifications</Label>
                  <p className="text-sm text-gray-500">Get notified when new chats start</p>
                </div>
                <Switch
                  checked={notifyNewChat}
                  onCheckedChange={setNotifyNewChat}
                  data-testid="switch-notify-new-chat"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saveSettingsMutation.isPending}
            size="lg"
            className="bg-green-500 hover:bg-green-600"
            data-testid="button-save-chat-settings"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
