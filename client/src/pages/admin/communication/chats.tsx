import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  ArrowLeft, 
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Paperclip
} from 'lucide-react';
import { Link } from 'wouter';
import AdminLayout from '../layout';

interface ChatConversation {
  id: string;
  participantName: string;
  participantRole: string;
  participantAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export default function Chats() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const { data: conversations = [] } = useQuery<ChatConversation[]>({
    queryKey: ['/api/admin/chats/conversations'],
    queryFn: async () => [
      { 
        id: '1', 
        participantName: 'Salem Dairy Union',
        participantRole: 'District Union',
        lastMessage: 'The milk delivery for tomorrow has been confirmed',
        lastMessageTime: '10:30 AM',
        unreadCount: 2,
        isOnline: true
      },
      { 
        id: '2', 
        participantName: 'Erode Dairy Union',
        participantRole: 'District Union',
        lastMessage: 'We need to discuss the butter pricing',
        lastMessageTime: '9:15 AM',
        unreadCount: 0,
        isOnline: true
      },
      { 
        id: '3', 
        participantName: 'Coimbatore Wholesale',
        participantRole: 'Wholesale Dealer',
        lastMessage: 'Order #12345 has been dispatched',
        lastMessageTime: 'Yesterday',
        unreadCount: 0,
        isOnline: false
      },
      { 
        id: '4', 
        participantName: 'Chennai Retail Hub',
        participantRole: 'Dealer',
        lastMessage: 'Can you check the curd stock availability?',
        lastMessageTime: 'Yesterday',
        unreadCount: 5,
        isOnline: false
      },
      { 
        id: '5', 
        participantName: 'Madurai Dairy Union',
        participantRole: 'District Union',
        lastMessage: 'Production schedule updated for next week',
        lastMessageTime: 'Jan 27',
        unreadCount: 0,
        isOnline: true
      },
    ],
  });

  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/admin/chats/messages', selectedConversation],
    enabled: !!selectedConversation,
    queryFn: async () => [
      { 
        id: '1', 
        senderId: 'other',
        senderName: 'Salem Dairy Union',
        content: 'Good morning! We have processed your order for 5000 liters of milk.',
        timestamp: '10:00 AM',
        isOwn: false
      },
      { 
        id: '2', 
        senderId: 'self',
        senderName: 'Federation Admin',
        content: 'Thank you! When can we expect delivery?',
        timestamp: '10:15 AM',
        isOwn: true
      },
      { 
        id: '3', 
        senderId: 'other',
        senderName: 'Salem Dairy Union',
        content: 'The milk delivery for tomorrow has been confirmed. Our trucks will arrive by 6 AM.',
        timestamp: '10:30 AM',
        isOwn: false
      },
    ],
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChat = conversations.find(c => c.id === selectedConversation);

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
            <h1 className="text-2xl font-semibold text-gray-900" data-testid="title-chats">
              Chats
            </h1>
            <p className="text-gray-600">View and manage conversations with unions, dealers, and retailers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-chats"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center gap-3 p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation === conv.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedConversation(conv.id)}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={conv.participantAvatar} />
                        <AvatarFallback>{getInitials(conv.participantName)}</AvatarFallback>
                      </Avatar>
                      {conv.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{conv.participantName}</span>
                        <span className="text-xs text-gray-500">{conv.lastMessageTime}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-blue-500 text-white ml-2">{conv.unreadCount}</Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">{conv.participantRole}</Badge>
                    </div>
                  </div>
                ))}
                
                {filteredConversations.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No conversations found</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            {selectedChat ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{getInitials(selectedChat.participantName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{selectedChat.participantName}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          {selectedChat.isOnline && (
                            <span className="h-2 w-2 bg-green-500 rounded-full" />
                          )}
                          {selectedChat.isOnline ? 'Online' : 'Offline'}
                          <span className="text-gray-400">•</span>
                          {selectedChat.participantRole}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.isOwn
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <span className={`text-xs ${message.isOwn ? 'text-blue-100' : 'text-gray-500'} mt-1 block`}>
                              {message.timestamp}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button variant="ghost" size="sm">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1"
                      data-testid="input-message"
                    />
                    <Button size="sm" data-testid="button-send-message">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <MessageCircle className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500 text-sm">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
