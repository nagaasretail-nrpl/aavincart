import { useState, useEffect, useCallback } from 'react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
} from '@/lib/notifications';

interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isEnabled: boolean;
  isLoading: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const supported = isNotificationSupported();
      setIsSupported(supported);
      
      if (supported) {
        const currentPermission = getNotificationPermission();
        setPermission(currentPermission);
        
        // Check localStorage for user preference
        const savedPreference = localStorage.getItem('notificationsEnabled');
        const enabled = savedPreference === 'true' && currentPermission === 'granted';
        setIsEnabled(enabled);
        
        // Register service worker if enabled
        if (enabled) {
          await registerServiceWorker();
        }
      }
      
      setIsLoading(false);
    };
    
    init();
  }, []);

  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    
    setIsLoading(true);
    
    try {
      // Request permission
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);
      
      if (newPermission === 'granted') {
        // Register service worker
        await registerServiceWorker();
        
        // Save preference
        localStorage.setItem('notificationsEnabled', 'true');
        setIsEnabled(true);
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  const disableNotifications = useCallback(() => {
    localStorage.setItem('notificationsEnabled', 'false');
    setIsEnabled(false);
  }, []);

  return {
    isSupported,
    permission,
    isEnabled,
    isLoading,
    enableNotifications,
    disableNotifications,
  };
}
