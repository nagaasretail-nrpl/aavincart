import { Bell, BellOff, BellRing, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { showPushNotification } from '@/lib/notifications';

interface NotificationBellProps {
  unreadCount?: number;
}

export function NotificationBell({ unreadCount = 0 }: NotificationBellProps) {
  const { isSupported, permission, isEnabled, isLoading, enableNotifications, disableNotifications } = useNotifications();
  const { toast } = useToast();

  const handleToggle = async () => {
    if (isEnabled) {
      disableNotifications();
      toast({
        title: 'Notifications Disabled',
        description: 'You will no longer receive push notifications',
      });
    } else {
      const success = await enableNotifications();
      if (success) {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications for important updates',
        });
        // Show a test notification
        setTimeout(() => {
          showPushNotification({
            title: 'Notifications Active!',
            body: 'You will receive alerts for orders, invoices, and more.',
            tag: 'test-notification',
          });
        }, 1000);
      } else if (permission === 'denied') {
        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
      }
    }
  };

  if (!isSupported) {
    return (
      <Button variant="ghost" size="icon" disabled title="Notifications not supported">
        <BellOff className="h-5 w-5 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {isEnabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && isEnabled && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4" />
              <span className="font-semibold">Push Notifications</span>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {permission === 'denied' && (
          <div className="px-2 py-3 text-sm text-red-600 bg-red-50 rounded-md mx-2 mb-2">
            <p className="font-medium">Notifications Blocked</p>
            <p className="text-xs mt-1">
              Please enable notifications in your browser settings to receive alerts.
            </p>
          </div>
        )}
        
        {isEnabled ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              You will receive notifications for:
            </DropdownMenuLabel>
            <div className="px-2 py-1 space-y-1">
              {[
                'New orders',
                'Order status updates',
                'Invoice created',
                'Payment received',
                'Payment due reminders',
                'Delivery updates',
                'Staff approval requests',
                'Credit alerts',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3 w-3 text-green-500" />
                  {item}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            <p>Enable notifications to get alerts for:</p>
            <ul className="mt-2 space-y-1 text-xs">
              <li>• New orders and status updates</li>
              <li>• Invoice and payment alerts</li>
              <li>• Delivery tracking updates</li>
              <li>• Staff approval requests</li>
            </ul>
          </div>
        )}
        
        {isEnabled && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={handleToggle}
            >
              <X className="h-4 w-4 mr-2" />
              Disable Notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
