/**
 * Native mobile haptic feedback helper using the standard Web Vibration API.
 * Safely degrades on unsupported devices (desktop, non-vibrating browsers).
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'selection';

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || !window.navigator || !('vibrate' in window.navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'light':
      case 'selection':
        window.navigator.vibrate(10);
        break;
      case 'medium':
        window.navigator.vibrate(25);
        break;
      case 'heavy':
        window.navigator.vibrate(45);
        break;
      case 'success':
        window.navigator.vibrate([15, 60, 25]);
        break;
      case 'warning':
        window.navigator.vibrate([30, 80, 30]);
        break;
    }
  } catch {
    // Silently ignore if blocked by browser policy
  }
}
