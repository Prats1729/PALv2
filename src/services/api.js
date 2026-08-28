// Centralized API fetcher with IPv4/localhost fallback for Tauri WebView2 and Web clients
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

export async function apiFetch(endpoint, options = {}) {
  const fullUrl = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  
  try {
    return await fetch(fullUrl, options);
  } catch (error) {
    // If localhost failed (common in Windows WebView2 IPv6 resolution), retry with 127.0.0.1
    if (fullUrl.includes("localhost:5000")) {
      const fallbackUrl = fullUrl.replace("localhost:5000", "127.0.0.1:5000");
      try {
        return await fetch(fallbackUrl, options);
      } catch {
        throw error;
      }
    }
    // If 127.0.0.1 failed, retry with localhost
    if (fullUrl.includes("127.0.0.1:5000")) {
      const fallbackUrl = fullUrl.replace("127.0.0.1:5000", "localhost:5000");
      try {
        return await fetch(fallbackUrl, options);
      } catch {
        throw error;
      }
    }
    throw error;
  }
}
