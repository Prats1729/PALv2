// Centralized API fetcher — single source of truth for backend URL.
// VITE_API_URL is injected at BUILD TIME by Vite from .env
// Hardcoded fallback ensures the packaged Tauri binary always uses production.
const BASE_URL = import.meta.env.VITE_API_URL || "https://palv2.onrender.com";

let inFlightRequests = 0;
let slowThresholdTimer = null;
let isBannerActive = false;

export async function apiFetch(endpoint, options = {}) {
  const { silent = false, ...fetchOptions } = options;
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  
  if (!silent) {
    inFlightRequests++;
    
    // If first in-flight request, start cold start detection timer (2.5s)
    if (inFlightRequests === 1 && !slowThresholdTimer) {
      slowThresholdTimer = setTimeout(() => {
        if (inFlightRequests > 0) {
          isBannerActive = true;
          window.dispatchEvent(
            new CustomEvent("pal-connecting-status", {
              detail: {
                isConnecting: true,
                message: "Waking up server instance... This may take a few seconds on cold starts.",
              },
            })
          );
        }
      }, 2500);
    }
  }

  try {
    const res = await fetch(url, fetchOptions);
    return res;
  } catch (err) {
    // Distinguish network failure from HTTP errors for better UX
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Network error — cannot reach the server. Check your internet connection.");
    }
    throw err;
  } finally {
    if (!silent) {
      inFlightRequests = Math.max(0, inFlightRequests - 1);
      // When all active in-flight requests finish, dismiss banner immediately
      if (inFlightRequests === 0) {
        if (slowThresholdTimer) {
          clearTimeout(slowThresholdTimer);
          slowThresholdTimer = null;
        }
        if (isBannerActive) {
          isBannerActive = false;
          window.dispatchEvent(
            new CustomEvent("pal-connecting-status", {
              detail: { isConnecting: false },
            })
          );
        }
      }
    }
  }
}
