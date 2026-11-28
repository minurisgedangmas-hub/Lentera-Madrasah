const BASE_DOCUMENT_TITLE =
  'Lentera Madrasah — Portal Akademik Terpadu Madrasah Ibtidaiyah (MI)';
const EXTERNAL_NOTIF_PREF_KEY = 'lentera_external_notif_enabled';

export function isAppBadgeSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return typeof navigator.setAppBadge === 'function';
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function isExternalNotifEnabled(): boolean {
  try {
    const raw = window.localStorage.getItem(EXTERNAL_NOTIF_PREF_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setExternalNotifEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(EXTERNAL_NOTIF_PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage quota / privacy mode failures
  }
}

export async function syncAppBadge(unreadCount: number): Promise<void> {
  const safeCount = Math.max(0, Math.floor(unreadCount));

  if (typeof document !== 'undefined') {
    document.title = safeCount > 0 ? `(${safeCount}) ${BASE_DOCUMENT_TITLE}` : BASE_DOCUMENT_TITLE;
  }

  if (typeof navigator === 'undefined') return;

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_BADGE',
        count: safeCount,
      });
    }
  } catch {
    // Ignore worker message errors
  }

  try {
    if (safeCount > 0 && typeof navigator.setAppBadge === 'function') {
      await navigator.setAppBadge(safeCount);
    } else if (safeCount === 0 && typeof navigator.clearAppBadge === 'function') {
      await navigator.clearAppBadge();
    }
  } catch {
    // Some embedded iframe contexts restrict Badging API silently
  }
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setExternalNotifEnabled(true);
    }
    return result;
  } catch {
    return Notification.permission;
  }
}

export async function showExternalSystemNotification(
  payload: { id?: string; title: string; message: string },
  unreadCount?: number
): Promise<boolean> {
  if (typeof unreadCount === 'number') {
    await syncAppBadge(unreadCount);
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body: payload.message,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.id || `lentera-notif-${Date.now()}`,
    data: { url: '/?tab=notifikasi' },
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1500)),
      ]);
      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(payload.title, options);
        return true;
      }
    }
  } catch {
    // Fallback to direct Window Notification below
  }

  try {
    const notif = new Notification(payload.title, options);
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return true;
  } catch {
    return false;
  }
}
