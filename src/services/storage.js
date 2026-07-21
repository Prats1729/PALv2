const SAVED_USERS_KEY = "pal_saved_usernames";

// Read saved usernames array from localStorage
export const getSavedUsernames = () => {
  try {
    const data = localStorage.getItem(SAVED_USERS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error parsing saved usernames:", err);
    return [];
  }
};

// Add or update a username in the saved list
export const saveUsername = (username) => {
  const list = getSavedUsernames();
  const trimmed = username ? username.trim() : "";
  if (!trimmed) return list;

  // Filter out any previous occurrence (case-insensitive)
  const filtered = list.filter(
    (u) => typeof u === "string" && u.toLowerCase() !== trimmed.toLowerCase()
  );
  const updated = [...filtered, trimmed];
  try {
    localStorage.setItem(SAVED_USERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Error saving username:", err);
  }
  return updated;
};

// Remove a username from the saved list
export const removeSavedUsername = (username) => {
  const list = getSavedUsernames();
  const trimmed = username ? username.trim() : "";
  const updated = list.filter(
    (u) => typeof u === "string" && u.toLowerCase() !== trimmed.toLowerCase()
  );
  try {
    localStorage.setItem(SAVED_USERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Error removing username:", err);
  }
  return updated;
};
