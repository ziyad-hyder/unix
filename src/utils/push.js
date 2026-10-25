import api from '../api/api.js';
import { isRunningStandalone, isIOSSafari } from './pwa.js';
import { getFriendlyErrorMessage } from './errors.js';

/**
 * Converts a base64url-encoded VAPID public key to a Uint8Array.
 * Required for passing applicationServerKey to PushManager.subscribe().
 */
export function urlBase64ToUint8Array(base64String) {
  if (!base64String) {
    throw new Error('VAPID public key string is empty');
  }
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const atobFn =
    typeof atob === 'function'
      ? atob
      : typeof globalThis !== 'undefined' && typeof globalThis.atob === 'function'
      ? globalThis.atob
      : (str) => Buffer.from(str, 'base64').toString('binary');

  const rawData = atobFn(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks whether Web Push is supported by the current browser environment.
 * On iOS, PushManager is only defined in iOS 16.4+ and ONLY when the PWA
 * has been installed to the Home Screen (standalone display mode).
 */
export function isPushSupported(
  nav = typeof navigator !== 'undefined' ? navigator : null,
  win = typeof window !== 'undefined' ? window : null
) {
  if (!nav || !win) return false;
  return Boolean(
    'serviceWorker' in nav &&
    'PushManager' in win &&
    'Notification' in win
  );
}

/**
 * Returns detailed push support info, including iOS Home Screen installation hints.
 */
export function getPushSupportDetails(
  nav = typeof navigator !== 'undefined' ? navigator : null,
  win = typeof window !== 'undefined' ? window : null
) {
  const supported = isPushSupported(nav, win);
  const isIOS = isIOSSafari(nav);
  const isStandalone = isRunningStandalone(win, nav);
  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

  return {
    supported,
    isIOS,
    isStandalone,
    permission,
    needsIOSInstall: isIOS && !isStandalone,
  };
}

/**
 * Returns whether a push subscription currently exists in this browser for UI toggle state.
 */
export async function getPushSubscriptionStatus() {
  if (!isPushSupported()) {
    const details = getPushSupportDetails();
    return {
      supported: false,
      subscribed: false,
      permission: details.permission,
      details,
    };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return {
      supported: true,
      subscribed: Boolean(subscription),
      permission: Notification.permission,
      subscription,
      details: getPushSupportDetails(),
    };
  } catch (error) {
    console.error('Failed to get push subscription status:', error);
    return {
      supported: true,
      subscribed: false,
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
      error,
      details: getPushSupportDetails(),
    };
  }
}

/**
 * Requests notification permission, registers a push subscription with the browser,
 * and sends the subscription JSON to the UniX backend.
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    const details = getPushSupportDetails();
    if (details.needsIOSInstall) {
      throw new Error("On iOS, please tap Share -> 'Add to Home Screen' to enable push notifications.");
    }
    throw new Error('Web push notifications are not supported in this browser.');
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey || vapidPublicKey.trim() === '' || vapidPublicKey.includes('YOUR_')) {
    console.error('VAPID public key is not configured. Please set VITE_VAPID_PUBLIC_KEY in .env.local.');
    throw new Error("Notifications aren't available right now.");
  }

  // 1. Request permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    if (permission === 'denied') {
      throw new Error('Notification permission was blocked. Please enable notifications in your browser settings.');
    }
    throw new Error('Notification permission was dismissed.');
  }

  // 2. Wait for service worker ready
  const registration = await navigator.serviceWorker.ready;

  // 3. Convert public key and subscribe via PushManager
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey.trim());
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  // 4. Send subscription JSON to backend (POST /api/push/subscribe)
  const subJson = subscription.toJSON();
  try {
    await api.post('/api/push/subscribe', {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
    });
  } catch (err) {
    throw new Error(getFriendlyErrorMessage(err, 'Failed to register notification subscription.'));
  }

  return subscription;
}

/**
 * Unsubscribes from push notifications locally and notifies the backend to delete the subscription row.
 */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      // 1. Inform backend
      try {
        await api.delete('/api/push/subscribe', {
          data: { endpoint },
        });
      } catch (err) {
        console.warn('Backend push unsubscribe returned error (possibly already deleted):', err);
      }

      // 2. Unsubscribe browser
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    throw error;
  }
}

/**
 * Calls backend POST /api/push/test to send a test notification to the current user.
 */
export async function sendTestPush() {
  try {
    const res = await api.post('/api/push/test');
    return res.data;
  } catch (err) {
    throw new Error(getFriendlyErrorMessage(err, 'Failed to send test push notification.'));
  }
}
