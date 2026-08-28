// Centralized API fetcher — single source of truth for backend URL.
// VITE_API_URL is injected at BUILD TIME by Vite from .env
// Hardcoded fallback ensures the packaged Tauri binary always uses production.
const BASE_URL = import.meta.env.VITE_API_URL || "https://palv2.onrender.com";

export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    // Distinguish network failure from HTTP errors for better UX
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error("Network error — cannot reach the server. Check your internet connection.");
    }
    throw err;
  }
}
