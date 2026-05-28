import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { apiRequest } from './queryClient';

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let currentToken: string | null = null;

const VAPID_KEY_STORAGE = 'fcm_vapid_key';

export async function initializeFirebaseClient(): Promise<FirebaseApp | null> {
  if (firebaseApp) return firebaseApp;

  try {
    const response = await fetch('/api/config/firebase');
    if (!response.ok) return null;
    const config = await response.json();

    firebaseApp = initializeApp(config);

    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      try {
        messaging = getMessaging(firebaseApp);
      } catch (err) {
        console.warn('Firebase Messaging not supported:', err);
      }
    }

    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase client:', error);
    return null;
  }
}

export async function requestFCMToken(userId?: string, role?: string, merchantId?: string): Promise<string | null> {
  if (!messaging) {
    await initializeFirebaseClient();
    if (!messaging) return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: localStorage.getItem(VAPID_KEY_STORAGE) || undefined,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      currentToken = token;
      await registerTokenWithServer(token, userId, role, merchantId);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

async function registerTokenWithServer(token: string, userId?: string, role?: string, merchantId?: string) {
  try {
    await apiRequest('POST', '/api/fcm/register', {
      token,
      userId,
      role,
      merchantId,
      platform: 'web',
    });
  } catch (error) {
    console.error('Failed to register FCM token with server:', error);
  }
}

export async function unregisterFCMToken() {
  if (currentToken) {
    try {
      await apiRequest('POST', '/api/fcm/unregister', { token: currentToken });
      currentToken = null;
    } catch (error) {
      console.error('Failed to unregister FCM token:', error);
    }
  }
}

export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
  if (!messaging) return null;

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Foreground FCM message:', payload);
    callback(payload);
  });

  return unsubscribe;
}

export function getFirebaseApp(): FirebaseApp | null {
  return firebaseApp;
}

export function getMessagingInstance(): Messaging | null {
  return messaging;
}

export function getCurrentToken(): string | null {
  return currentToken;
}
