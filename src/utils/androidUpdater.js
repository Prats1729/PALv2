import { isAndroid } from "./platform.js";

/**
 * Compares two semantic version strings (e.g. "3.0.1" > "3.0.0" or "3.0.1-test" vs "3.0.0").
 * Returns true if vLatest is strictly newer than vCurrent.
 */
export function isNewerVersion(vLatest, vCurrent) {
  if (!vLatest || !vCurrent) return false;

  const cleanLatest = vLatest.replace(/^v/, "").trim();
  const cleanCurrent = vCurrent.replace(/^v/, "").trim();

  if (cleanLatest === cleanCurrent) return false;

  const parseParts = (v) => {
    const main = v.split("-")[0];
    return main.split(".").map((n) => parseInt(n, 10) || 0);
  };

  const lParts = parseParts(cleanLatest);
  const cParts = parseParts(cleanCurrent);

  for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
    const l = lParts[i] || 0;
    const c = cParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }

  // If numeric parts are equal, handle test/prerelease suffix comparison
  return cleanLatest > cleanCurrent;
}

/**
 * Gets the current Android app version.
 */
export async function getAndroidAppVersion() {
  if (isAndroid()) {
    try {
      const { App } = await import("@capacitor/app");
      const info = await App.getInfo();
      if (info?.version) return info.version;
    } catch (e) {
      console.warn("[Android Updater] Could not get native app info:", e);
    }
  }
  return "3.0.0";
}

/**
 * Queries GitHub Releases specifically for releases containing an Android APK asset.
 * @param {boolean} notifyIfLatest - whether to alert the user if already on latest version
 */
export async function checkAndroidUpdates(notifyIfLatest = false) {
  if (import.meta.env.DEV) {
    if (notifyIfLatest) {
      window.dispatchEvent(
        new CustomEvent("pal-toast", {
          detail: { message: "Running in local Dev mode. Updates apply to installed APK builds.", type: "info" },
        })
      );
    }
    return null;
  }

  if (!isAndroid()) return null;

  try {
    const currentVersion = await getAndroidAppVersion();

    // Query GitHub releases list to support standard releases and test prereleases
    const res = await fetch("https://api.github.com/repos/Prats1729/PALv2/releases?per_page=10", {
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const releases = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) {
      if (notifyIfLatest) {
        window.dispatchEvent(
          new CustomEvent("pal-toast", {
            detail: { message: "No releases found on GitHub.", type: "info" },
          })
        );
      }
      return null;
    }

    // Find the newest release that contains a valid Android APK asset
    let targetRelease = null;
    let apkAsset = null;

    for (const rel of releases) {
      if (!rel.assets || rel.assets.length === 0) continue;
      const foundApk = rel.assets.find(
        (asset) =>
          asset.name &&
          asset.name.toLowerCase().endsWith(".apk") &&
          !asset.name.toLowerCase().includes("unaligned")
      );
      if (foundApk) {
        targetRelease = rel;
        apkAsset = foundApk;
        break;
      }
    }

    if (!targetRelease || !apkAsset) {
      if (notifyIfLatest) {
        window.dispatchEvent(
          new CustomEvent("pal-toast", {
            detail: { message: "No Android APK builds found in recent releases.", type: "info" },
          })
        );
      }
      return null;
    }

    const releaseVersion = targetRelease.tag_name.replace(/^v/, "").trim();

    if (isNewerVersion(releaseVersion, currentVersion)) {
      return {
        available: true,
        version: releaseVersion,
        currentVersion,
        body: targetRelease.body || "Performance improvements, bug fixes, and enhancements.",
        publishedAt: targetRelease.published_at,
        apkAsset: {
          name: apkAsset.name,
          downloadUrl: apkAsset.browser_download_url,
          size: apkAsset.size,
        },
        platform: "android",
      };
    } else {
      if (notifyIfLatest) {
        window.dispatchEvent(
          new CustomEvent("pal-toast", {
            detail: { message: `You are on the latest version of PAL (v${currentVersion})!`, type: "success" },
          })
        );
      }
      return null;
    }
  } catch (error) {
    console.error("[Android Updater] Failed to check for updates:", error);
    if (notifyIfLatest) {
      window.dispatchEvent(
        new CustomEvent("pal-toast", {
          detail: { message: `Update check failed: ${error?.message || error}`, type: "error" },
        })
      );
    }
    return null;
  }
}

/**
 * Downloads and triggers installation of the Android APK.
 * Uses native ApkUpdater plugin when available, or opens system download manager.
 * @param {object} update - Update object containing apkAsset
 * @param {function} onProgress - Progress callback ({ percent, downloaded, total, finished })
 */
export async function downloadAndApplyAndroidUpdate(update, onProgress) {
  if (!update || !update.apkAsset) {
    throw new Error("Invalid update metadata: missing APK asset.");
  }

  const downloadUrl = update.apkAsset.downloadUrl;
  const fileName = update.apkAsset.name || `PAL-${update.version}.apk`;

  // 1. Check if native ApkUpdater plugin is registered on Capacitor
  const ApkUpdater = window.Capacitor?.Plugins?.ApkUpdater;
  if (ApkUpdater && typeof ApkUpdater.downloadAndInstall === "function") {
    try {
      if (onProgress) onProgress({ percent: 10, downloaded: 0, total: update.apkAsset.size || 0 });

      // Add progress listener if supported by native plugin
      let listenerHandle = null;
      if (typeof ApkUpdater.addListener === "function") {
        listenerHandle = await ApkUpdater.addListener("downloadProgress", (data) => {
          if (onProgress) {
            onProgress({
              percent: data.percent || 0,
              downloaded: data.downloaded || 0,
              total: data.total || update.apkAsset.size || 0,
              finished: data.percent >= 100,
            });
          }
        });
      }

      await ApkUpdater.downloadAndInstall({
        url: downloadUrl,
        fileName,
        version: update.version,
      });

      if (listenerHandle && typeof listenerHandle.remove === "function") {
        listenerHandle.remove();
      }

      if (onProgress) onProgress({ percent: 100, finished: true });
      return;
    } catch (nativeErr) {
      console.warn("[Android Updater] Native APK updater error, falling back to direct download:", nativeErr);
    }
  }

  // 2. Fallback: Open APK directly in Android system browser/download manager
  if (onProgress) onProgress({ percent: 100, finished: true });
  window.open(downloadUrl, "_system");
}
