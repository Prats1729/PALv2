import { isTauri, isAndroid, isWeb, platformCapabilities } from "./platform.js";
import { checkDesktopUpdates, downloadAndApplyDesktopUpdate, getDesktopAppVersion } from "./desktopUpdater.js";
import { checkAndroidUpdates, downloadAndApplyAndroidUpdate, getAndroidAppVersion } from "./androidUpdater.js";

// Re-export platform helpers for backward compatibility
export { isTauri, isAndroid, isWeb, platformCapabilities };

/**
 * Checks for updates on the active platform (Tauri on Desktop, GitHub Releases on Android).
 * @param {boolean} notifyIfLatest - whether to alert the user if they're already on the latest version
 */
export async function checkForAppUpdates(notifyIfLatest = false) {
  if (isTauri()) {
    return checkDesktopUpdates(notifyIfLatest);
  }

  if (isAndroid()) {
    return checkAndroidUpdates(notifyIfLatest);
  }

  if (notifyIfLatest) {
    window.dispatchEvent(
      new CustomEvent("pal-toast", {
        detail: { message: "The web edition is always updated automatically on load.", type: "info" },
      })
    );
  }
  return null;
}

/**
 * Downloads and applies the update based on platform.
 * @param {object} update - Update object returned by checkForAppUpdates
 * @param {function} onProgress - Progress callback ({ percent, downloaded, total, finished })
 */
export async function downloadAndApplyUpdate(update, onProgress) {
  if (!update) return;

  if (isTauri() || update.platform === "desktop") {
    return downloadAndApplyDesktopUpdate(update, onProgress);
  }

  if (isAndroid() || update.platform === "android") {
    return downloadAndApplyAndroidUpdate(update, onProgress);
  }

  throw new Error("Updates are not supported on this platform.");
}

/**
 * Gets the current app version for the active platform.
 */
export async function getCurrentAppVersion() {
  if (isTauri()) {
    return getDesktopAppVersion();
  }
  if (isAndroid()) {
    return getAndroidAppVersion();
  }
  return "3.0.0";
}

/**
 * Checks if the app was recently updated and returns the patch notes to display once on startup.
 */
export async function checkPatchNotesOnStartup() {
  const currentVersion = await getCurrentAppVersion();
  const lastSeen = localStorage.getItem("pal_last_seen_version");

  // If lastSeen doesn't match currentVersion, this is the first launch of a new version!
  if (lastSeen && lastSeen !== currentVersion) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/Prats1729/PALv2/releases/tags/v${currentVersion}`
      );
      if (res.ok) {
        const data = await res.json();
        return {
          version: currentVersion,
          title: data.name || `PAL v${currentVersion}`,
          body: data.body || "Performance improvements, bug fixes, and general enhancements.",
          publishedAt: data.published_at,
        };
      }
    } catch (err) {
      console.warn("[Updater] Could not fetch release notes from GitHub:", err);
    }

    return {
      version: currentVersion,
      title: `PAL v${currentVersion}`,
      body: "Welcome to the latest version of PAL with performance enhancements and bug fixes.",
    };
  }

  // If first time ever opening the app, initialize lastSeen
  if (!lastSeen) {
    localStorage.setItem("pal_last_seen_version", currentVersion);
  }

  return null;
}
