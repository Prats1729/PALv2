import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { isTauri } from "./platform.js";

/**
 * Checks for updates on Desktop (via Tauri updater plugin)
 * @param {boolean} notifyIfLatest - whether to alert the user if they're already on the latest version
 */
export async function checkDesktopUpdates(notifyIfLatest = false) {
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

  if (!isTauri()) return null;

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
          console.warn("[Desktop Updater] Could not fetch extended changelog:", e);
        }
      }
      return {
        ...update,
        platform: "desktop",
      };
    } else {
      if (notifyIfLatest) {
        window.dispatchEvent(
          new CustomEvent("pal-toast", {
            detail: { message: "You are on the latest version of PAL!", type: "success" },
          })
        );
      }
      return null;
    }
  } catch (error) {
    console.error("[Desktop Updater] Failed to check for updates:", error);
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
 * Downloads and applies the update on desktop, then restarts the app.
 * @param {object} update - Update instance returned from check()
 * @param {function} onProgress - Progress callback ({ percent, downloaded, total })
 */
export async function downloadAndApplyDesktopUpdate(update, onProgress) {
  if (!update) return;

  try {
    let downloaded = 0;
    let contentLength = 0;

    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started": {
          contentLength = event.data.contentLength || 0;
          if (onProgress) onProgress({ percent: 0, downloaded: 0, total: contentLength });
          break;
        }
        case "Progress": {
          downloaded += event.data.chunkLength;
          const percent = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
          if (onProgress) onProgress({ percent, downloaded, total: contentLength });
          break;
        }
        case "Finished": {
          if (onProgress) onProgress({ percent: 100, downloaded: contentLength, total: contentLength, finished: true });
          break;
        }
      }
    });

    // Relaunch the desktop app after installation
    await relaunch();
  } catch (err) {
    console.error("[Desktop Updater] Failed to install update:", err);
    throw err;
  }
}

/**
 * Gets the current Tauri app version
 */
export async function getDesktopAppVersion() {
  if (isTauri()) {
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      return await getVersion();
    } catch (e) {
      console.warn("Could not get Tauri app version:", e);
    }
  }
  return "3.0.0";
}
