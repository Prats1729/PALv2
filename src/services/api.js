// Centralized API fetcher for Web and Tauri Desktop clients
const BASE_URL = import.meta.env.VITE_API_URL || "https://palv2.onrender.com";

export async function apiFetch(endpoint, options = {}) {
  const fullUrl = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  return await fetch(fullUrl, options);
}
