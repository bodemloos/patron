/**
 * Capacitor native bootstrap.
 *
 * The plugins resolve to no-op shims when this bundle is loaded in a
 * regular browser (Capacitor.isNativePlatform() === false), so this
 * module is safe to import from `main.jsx` regardless of platform.
 *
 * Anything that should only happen inside the native shell — hiding
 * the launch splash, pinning the status-bar style, configuring the
 * keyboard, opening external URLs in the in-app browser, wiring the
 * Android hardware back button — lives behind the isNativePlatform()
 * check below.
 */
import { Capacitor } from '@capacitor/core';

let bootstrapped = false;

/** True when running inside an iOS / Android Capacitor shell. */
export function isNative() {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

/** Lowercased platform tag — `'ios' | 'android' | 'web'`. */
export function platform() {
  try { return Capacitor.getPlatform(); } catch { return 'web'; }
}

/**
 * Run once on app startup. Idempotent — extra calls are ignored, so
 * React StrictMode's double-effect during dev doesn't double-init.
 */
export async function bootstrapNative() {
  if (bootstrapped) return;
  bootstrapped = true;
  if (!isNative()) return;

  // Lazy-load the plugins so the regular web bundle stays small.
  // (Tree-shaking handles the import paths fine since they're constant.)
  const [{ SplashScreen }, { StatusBar, Style }, { Keyboard }, { App }] =
    await Promise.all([
      import('@capacitor/splash-screen'),
      import('@capacitor/status-bar'),
      import('@capacitor/keyboard'),
      import('@capacitor/app'),
    ]);

  // Status bar — match the warm-charcoal app shell.
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0F0F10' });
    }
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (e) { /* status-bar plugin not installed yet on this platform */ }

  // Keyboard — make sure tapping inputs near the bottom of the screen
  // shifts the layout up rather than covering them.
  try {
    Keyboard.setAccessoryBarVisible?.({ isVisible: false });
  } catch (e) { /* not available on this platform */ }

  // Android hardware back button — pop the SPA's history if there's
  // anywhere to go back to, otherwise let the OS exit the app.
  try {
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch (e) { /* App plugin not installed */ }

  // Hide the launch splash now that the React tree is mounting. We
  // schedule this on the next tick so the first paint is already up.
  setTimeout(() => {
    try { SplashScreen.hide({ fadeOutDuration: 200 }); } catch (e) {}
  }, 0);
}

/**
 * Open a URL in a way that suits the current platform:
 *   - native: in-app browser tab (Capacitor Browser plugin)
 *   - web:    a new browser tab via window.open
 * Falls back to plain window.open if the plugin import fails.
 */
export async function openExternal(url) {
  if (!url) return;
  if (!isNative()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
  } catch (e) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
