import { initializeFirebaseClient, requestFCMToken, onForegroundMessage, unregisterFCMToken } from './firebase';

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
}

export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export async function initializePushNotifications(userId?: string, role?: string, merchantId?: string): Promise<string | null> {
  await initializeFirebaseClient();
  const token = await requestFCMToken(userId, role, merchantId);
  
  if (token) {
    onForegroundMessage((payload: any) => {
      const notification = payload.notification;
      if (notification) {
        showLocalNotification({
          title: notification.title || 'Aavincart',
          body: notification.body || '',
          icon: notification.icon,
          url: payload.fcmOptions?.link || payload.data?.url,
        });
      }
    });
  }
  
  return token;
}

export async function unsubscribePushNotifications() {
  await unregisterFCMToken();
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export function showLocalNotification(data: NotificationData): void {
  if (getNotificationPermission() !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }
  
  const notification = new Notification(data.title, {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    tag: data.tag || `notification-${Date.now()}`,
    requireInteraction: data.requireInteraction || false,
  });
  
  notification.onclick = () => {
    window.focus();
    if (data.url) {
      window.location.href = data.url;
    }
    notification.close();
  };
}

export async function showPushNotification(data: NotificationData): Promise<void> {
  if (getNotificationPermission() !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      tag: data.tag || `notification-${Date.now()}`,
      data: { url: data.url },
      requireInteraction: data.requireInteraction || false,
    } as NotificationOptions);
  } catch (error) {
    showLocalNotification(data);
  }
}

export const NotificationTypes = {
  NEW_ORDER: 'new-order',
  ORDER_UPDATE: 'order-update',
  INVOICE_CREATED: 'invoice-created',
  PAYMENT_RECEIVED: 'payment-received',
  PAYMENT_DUE: 'payment-due',
  DELIVERY_UPDATE: 'delivery-update',
  STAFF_APPROVAL: 'staff-approval',
  CREDIT_ALERT: 'credit-alert',
  GENERAL: 'general',
} as const;

export const notifyNewOrder = (orderId: string, customerName: string) => {
  showPushNotification({
    title: 'New Order Received!',
    body: `Order ${orderId} from ${customerName}`,
    tag: NotificationTypes.NEW_ORDER,
    url: '/union/dashboard?section=new-orders',
  });
};

export const notifyOrderUpdate = (orderId: string, status: string) => {
  showPushNotification({
    title: 'Order Status Updated',
    body: `Order ${orderId} is now ${status}`,
    tag: NotificationTypes.ORDER_UPDATE,
    url: '/union/dashboard?section=all-orders',
  });
};

export const notifyInvoiceCreated = (invoiceNo: string, customerName: string, amount: string) => {
  showPushNotification({
    title: 'Invoice Created',
    body: `Invoice ${invoiceNo} for ${customerName} - ₹${amount}`,
    tag: NotificationTypes.INVOICE_CREATED,
    url: '/union/dashboard?section=invoice-list',
  });
};

export const notifyPaymentReceived = (invoiceNo: string, amount: string) => {
  showPushNotification({
    title: 'Payment Received!',
    body: `₹${amount} received for Invoice ${invoiceNo}`,
    tag: NotificationTypes.PAYMENT_RECEIVED,
    url: '/union/dashboard?section=invoice-list',
  });
};

export const notifyPaymentDue = (invoiceNo: string, customerName: string, daysOverdue: number) => {
  showPushNotification({
    title: 'Payment Overdue',
    body: `Invoice ${invoiceNo} from ${customerName} is ${daysOverdue} days overdue`,
    tag: NotificationTypes.PAYMENT_DUE,
    url: '/union/dashboard?section=invoice-list',
    requireInteraction: true,
  });
};

export const notifyDeliveryUpdate = (orderId: string, status: string) => {
  showPushNotification({
    title: 'Delivery Update',
    body: `Order ${orderId}: ${status}`,
    tag: NotificationTypes.DELIVERY_UPDATE,
    url: '/union/dashboard?section=all-orders',
  });
};

export const notifyStaffApproval = (staffName: string, action: 'pending' | 'approved' | 'rejected') => {
  const messages = {
    pending: `${staffName} has requested access approval`,
    approved: `${staffName}'s access has been approved`,
    rejected: `${staffName}'s access has been rejected`,
  };
  showPushNotification({
    title: 'Staff Approval',
    body: messages[action],
    tag: NotificationTypes.STAFF_APPROVAL,
    url: '/union/dashboard?section=staff-approvals',
  });
};

export const notifyCreditAlert = (customerName: string, message: string) => {
  showPushNotification({
    title: 'Credit Alert',
    body: `${customerName}: ${message}`,
    tag: NotificationTypes.CREDIT_ALERT,
    url: '/union/dashboard?section=credit-report',
    requireInteraction: true,
  });
};
