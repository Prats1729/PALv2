import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export const isTauri = () => {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
};

/**
 * Checks for updates on GitHub Releases
 * @param {boolean} notifyIfLatest - whether to alert the user if they're already on the latest version
 */
export async function checkForAppUpdates(notifyIfLatest = false) {
  // In development mode, skip auto-update so it doesn't interrupt local coding
  if (import.meta.env.DEV) {
    if (notifyIfLatest) {
      window.dispatchEvent(
        new CustomEvent("pal-toast", {
          detail: { message: "Running in local Dev mode. Updates apply to installed builds.", type: "info" },
        })
      );
    }
    return null;
  }

  if (!isTauri()) {
    if (notifyIfLatest) {
      window.dispatchEvent(
        new CustomEvent("pal-toast", {
          detail: { message: "Auto-updater is active in Desktop App builds.", type: "info" },
        })
      );
    }
    return null;
  }

  try {
    const update = await check();
    if (update?.available) {
      // If release notes are empty or brief, fetch full changelog from GitHub Release
      if (!update.body || update.body.trim().length < 15) {
        try {
          const res = await fetch(
            `https://api.github.com/repos/Prats1729/PALv2/releases/tags/v${update.version}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.body) {
              update.body = data.body;
            }
          }
        } catch (e) {
          console.warn("[Updater] Could not fetch extended changelog:", e);
        }
      }
      return update;
    } else {
      if (notifyIfLatest) {
        window.dispatchEvent(
          new CustomEvent("pal-toast", {
            detail: { message: "You are on the latest version of PALv2!", type: "success" },
          })
        );
      }
      return null;
    }
  } catch (error) {
    console.error("[Updater] Failed to check for updates:", error);
    if (notifyIfLatest) {
      window.dispatchEvent(
        new CustomEvent("pal-toast", {
          detail: { message: `Update check: ${error?.message || error}`, type: "error" },
        })
      );
    }
    return null;
  }
}

/**
 * Downloads and applies the update, then restarts the app.
 * @param {object} update - Update instance returned from check()
 * @param {function} onProgress - Progress callback ({ percent, downloaded, total })
 */
export async function downloadAndApplyUpdate(update, onProgress) {
  if (!update) return;

  try {
    let downloaded = 0;
    let contentLength = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          contentLength = event.data.contentLength || 0;
          if (onProgress) onProgress({ percent: 0, downloaded: 0, total: contentLength });
          break;
        case "Progress":
          downloaded += event.data.chunkLength;
          const percent = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
          if (onProgress) onProgress({ percent, downloaded, total: contentLength });
          break;
        case "Finished":
          if (onProgress) onProgress({ percent: 100, downloaded, total: contentLength, finished: true });
          break;
      }
    });

    // Relaunch the desktop app after installation
    await relaunch();
  } catch (err) {
    console.error("[Updater] Failed to install update:", err);
    throw err;
  }
}

/**
 * Gets the current app version
 */
export async function getCurrentAppVersion() {
  if (isTauri()) {
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      return await getVersion();
    } catch (e) {
      console.warn("Could not get Tauri app version:", e);
    }
  }
  return "2.1.9";
}

/**
 * Checks if the app was recently updated and returns the patch notes to display once on startup
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
          title: data.name || `PALv2 v${currentVersion}`,
          body: data.body || "Performance improvements, bug fixes, and general enhancements.",
          publishedAt: data.published_at,
        };
      }
    } catch (err) {
      console.warn("Could not fetch release notes from GitHub:", err);
    }

    return {
      version: currentVersion,
      title: `PALv2 v${currentVersion}`,
      body: "Welcome to the latest version of PALv2 with performance enhancements and bug fixes.",
    };
  }

  // If first time ever opening the app, initialize lastSeen
  if (!lastSeen) {
    localStorage.setItem("pal_last_seen_version", currentVersion);
  }

  return null;
}
