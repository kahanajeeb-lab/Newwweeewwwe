/**
 * Device Permissions & Media Hardware Diagnostics Utility
 * Handles microphone, camera, notification, and network status checks gracefully.
 */

export interface PermissionCheckResult {
  granted: boolean;
  error?: string;
  errorType?: 'denied' | 'not_found' | 'busy' | 'unsupported' | 'unknown';
}

/**
 * Parses WebRTC / MediaDevices exceptions into user-friendly messages.
 */
export function parseMediaError(error: any): { message: string; type: PermissionCheckResult['errorType'] } {
  const name = error?.name || '';
  const msg = error?.message || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.includes('Permission denied')) {
    return {
      message: 'Access denied. Please enable camera/microphone permissions in your browser or device settings.',
      type: 'denied'
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      message: 'No hardware camera or microphone was detected on this device.',
      type: 'not_found'
    };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || msg.includes('in use')) {
    return {
      message: 'Camera or microphone is already in use by another application. Please close other apps and try again.',
      type: 'busy'
    };
  }
  if (name === 'OverconstrainedError') {
    return {
      message: 'The requested camera resolution or facing mode is not supported by your hardware.',
      type: 'unsupported'
    };
  }
  if (name === 'SecurityError') {
    return {
      message: 'Media capture was blocked due to an insecure context. HTTPS is required.',
      type: 'unsupported'
    };
  }

  return {
    message: error?.message || 'An unexpected error occurred while accessing media hardware.',
    type: 'unknown'
  };
}

/**
 * Checks if browser has media devices support.
 */
export function isMediaDevicesSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Checks if display media (screen sharing) is supported.
 */
export function isDisplayMediaSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
}

/**
 * Requests browser notification permission if not yet decided.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  try {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Sends a local desktop notification if permitted.
 */
export function showSystemNotification(title: string, options?: NotificationOptions): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    } catch (e) {
      console.warn('Could not post notification:', e);
    }
  }
}
