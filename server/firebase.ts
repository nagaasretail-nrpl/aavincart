import admin from 'firebase-admin';
import { db } from './db';
import { fcmDeviceTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App | null {
  if (firebaseApp) return firebaseApp;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set - Firebase features disabled');
    return null;
  }

  try {
    let serviceAccount: any;

    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
      const fixedJson = serviceAccountJson.replace(/\n/g, '\\n');
      serviceAccount = JSON.parse(fixedJson);
    }

    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      console.error('Firebase service account JSON is missing required fields (project_id, private_key, client_email). Please provide the full service account JSON.');
      return null;
    }

    if (typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
    console.log(`Firebase Admin SDK initialized for project: ${serviceAccount.project_id}`);
    return firebaseApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    console.error('Please ensure FIREBASE_SERVICE_ACCOUNT_JSON contains the complete service account JSON file contents.');
    return null;
  }
}

export function getFirebaseAdmin(): admin.app.App | null {
  return firebaseApp;
}

export function getMessaging(): admin.messaging.Messaging | null {
  const app = getFirebaseAdmin();
  if (!app) return null;
  return admin.messaging(app);
}

export async function registerDeviceToken(token: string, data: { userId?: string; role?: string; merchantId?: string; platform?: string }) {
  try {
    const existing = await db.select().from(fcmDeviceTokens).where(eq(fcmDeviceTokens.token, token)).limit(1);

    if (existing.length > 0) {
      await db.update(fcmDeviceTokens).set({
        userId: data.userId || null,
        role: data.role || null,
        merchantId: data.merchantId || null,
        platform: data.platform || 'web',
        updatedAt: new Date(),
      }).where(eq(fcmDeviceTokens.token, token));
    } else {
      await db.insert(fcmDeviceTokens).values({
        token,
        userId: data.userId || null,
        role: data.role || null,
        merchantId: data.merchantId || null,
        platform: data.platform || 'web',
      });
    }
  } catch (error) {
    console.error('Failed to register device token:', error);
  }
}

export async function removeDeviceToken(token: string) {
  try {
    await db.delete(fcmDeviceTokens).where(eq(fcmDeviceTokens.token, token));
  } catch (error) {
    console.error('Failed to remove device token:', error);
  }
}

export async function getDeviceTokensForUser(userId: string): Promise<string[]> {
  try {
    const rows = await db.select({ token: fcmDeviceTokens.token }).from(fcmDeviceTokens).where(eq(fcmDeviceTokens.userId, userId));
    return rows.map(r => r.token);
  } catch (error) {
    console.error('Failed to get tokens for user:', error);
    return [];
  }
}

export async function getDeviceTokensForRole(role: string): Promise<string[]> {
  try {
    const rows = await db.select({ token: fcmDeviceTokens.token }).from(fcmDeviceTokens).where(eq(fcmDeviceTokens.role, role));
    return rows.map(r => r.token);
  } catch (error) {
    console.error('Failed to get tokens for role:', error);
    return [];
  }
}

export async function getDeviceTokensForMerchant(merchantId: string): Promise<string[]> {
  try {
    const rows = await db.select({ token: fcmDeviceTokens.token }).from(fcmDeviceTokens).where(eq(fcmDeviceTokens.merchantId, merchantId));
    return rows.map(r => r.token);
  } catch (error) {
    console.error('Failed to get tokens for merchant:', error);
    return [];
  }
}

export async function getAllDeviceTokens(): Promise<string[]> {
  try {
    const rows = await db.select({ token: fcmDeviceTokens.token }).from(fcmDeviceTokens);
    return rows.map(r => r.token);
  } catch (error) {
    console.error('Failed to get all tokens:', error);
    return [];
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  clickAction?: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(tokens: string[], payload: PushNotificationPayload): Promise<{ success: number; failure: number }> {
  const messaging = getMessaging();
  if (!messaging) {
    console.warn('Firebase Messaging not available');
    return { success: 0, failure: tokens.length };
  }

  if (tokens.length === 0) {
    return { success: 0, failure: 0 };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.icon ? { imageUrl: payload.icon } : {}),
      },
      data: payload.data || {},
      webpush: {
        notification: {
          icon: payload.icon || '/favicon.ico',
          badge: '/favicon.ico',
          requireInteraction: false,
        },
        fcmOptions: {
          link: payload.clickAction || '/',
        },
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#4AB3E8',
          clickAction: payload.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
        },
        priority: 'high',
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code;
        if (errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token') {
          removeDeviceToken(tokens[idx]);
        }
      }
    });

    return {
      success: response.successCount,
      failure: response.failureCount,
    };
  } catch (error) {
    console.error('FCM send error:', error);
    return { success: 0, failure: tokens.length };
  }
}

export async function sendToUser(userId: string, payload: PushNotificationPayload) {
  const tokens = await getDeviceTokensForUser(userId);
  return sendPushNotification(tokens, payload);
}

export async function sendToRole(role: string, payload: PushNotificationPayload) {
  const tokens = await getDeviceTokensForRole(role);
  return sendPushNotification(tokens, payload);
}

export async function sendToMerchant(merchantId: string, payload: PushNotificationPayload) {
  const tokens = await getDeviceTokensForMerchant(merchantId);
  return sendPushNotification(tokens, payload);
}

export async function sendToAll(payload: PushNotificationPayload) {
  const tokens = await getAllDeviceTokens();
  return sendPushNotification(tokens, payload);
}
