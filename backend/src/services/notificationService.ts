import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize firebase admin if keys are provided
let isFirebaseInitialized = false;

const fcmProjectId = process.env.FCM_PROJECT_ID;
const fcmClientEmail = process.env.FCM_CLIENT_EMAIL;
const fcmPrivateKey = process.env.FCM_PRIVATE_KEY;

if (fcmProjectId && fcmClientEmail && fcmPrivateKey) {
  try {
    initializeApp({
      credential: cert({
        projectId: fcmProjectId,
        clientEmail: fcmClientEmail,
        privateKey: fcmPrivateKey.replace(/\\n/g, '\n'),
      }),
    });
    isFirebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
  }
} else {
  console.log('Firebase credentials missing. Notifications will run in console log fallback mode.');
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendPushNotification = async (tokens: string[], payload: PushPayload): Promise<void> => {
  if (tokens.length === 0) return;

  const messagePayload = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
  };

  if (isFirebaseInitialized) {
    try {
      // Send to multiple tokens
      const response = await getMessaging().sendEachForMulticast({
        tokens,
        ...messagePayload,
      } as any);
      console.log(`Successfully sent ${response.successCount} push notifications; failed ${response.failureCount}.`);
    } catch (error) {
      console.error('Error sending FCM push notifications:', error);
    }
  } else {
    console.log('[MOCK FCM NOTIFICATION SENT]');
    console.log(`Tokens: ${tokens.join(', ')}`);
    console.log(`Payload:`, JSON.stringify(messagePayload, null, 2));
  }
};
