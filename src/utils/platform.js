import { Capacitor } from "@capacitor/core";

/**
 * Checks if running inside the Tauri desktop runtime.
 */
export const isTauri = () => {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
};

/**
 * Checks if running inside the Capacitor native runtime.
 */
export const isCapacitor = () => {
  return typeof window !== "undefined" && Boolean(Capacitor?.isNativePlatform?.());
};

/**
 * Checks if running on Android.
 */
export const isAndroid = () => {
  return typeof window !== "undefined" && Capacitor?.getPlatform?.() === "android";
};

/**
 * Checks if running on Desktop.
 */
export const isDesktop = () => {
  return isTauri();
};

/**
 * Checks if running in a standard web browser.
 */
export const isWeb = () => {
  return !isTauri() && !isCapacitor();
};

/**
 * Gets the current platform identifier.
 * @returns {'web' | 'desktop' | 'android' | 'ios'}
 */
export const getPlatform = () => {
  if (isTauri()) return "desktop";
  if (isAndroid()) return "android";
  if (isCapacitor()) return Capacitor.getPlatform();
  return "web";
};

/**
 * Platform Capabilities matrix:
 *
 * Web:
 *   playback = false
 *   continueWatching = false
 *   canShowDesktopDownload = true
 *   isMobileNav = true
 *
 * Android:
 *   playback = false
 *   continueWatching = false
 *   canShowDesktopDownload = false
 *   isMobileNav = true
 *
 * Desktop:
 *   playback = true
 *   continueWatching = true
 *   canShowDesktopDownload = false
 *   isMobileNav = false
 */
export const platformCapabilities = {
  get playback() {
    return isDesktop();
  },
  get continueWatching() {
    return isDesktop();
  },
  get canShowDesktopDownload() {
    return isWeb();
  },
  get isMobileNav() {
    return !isDesktop();
  },
  get hasUpdater() {
    return isDesktop() || isAndroid();
  }
};
