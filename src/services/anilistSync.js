// AniList Sync Service — Mutations to update user's real AniList account
const ANILIST_API = "https://graphql.anilist.co";

// Map PALv2 status strings to AniList MediaListStatus enum
const STATUS_MAP = {
  "Watching": "CURRENT",
  "Completed": "COMPLETED",
  "On Hold": "PAUSED",
  "Dropped": "DROPPED",
  "Plan to Watch": "PLANNING",
};

/**
 * Saves/updates an anime entry on the user's real AniList account.
 * @param {string} anilistToken - The user's decrypted AniList access token
 * @param {number} mediaId - The AniList media ID
 * @param {string} status - PALv2 status string (e.g. "Watching")
 * @param {number} progress - Episodes watched
 * @param {number|null} score - Score out of 10 (AniList uses 10-point by default)
 */
export async function syncToAniList(anilistToken, mediaId, status, progress, score) {
  if (!anilistToken) return null;

  const mutation = `
    mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
        id
        status
        progress
        score
      }
    }
  `;

  const variables = {
    mediaId,
    status: STATUS_MAP[status] || "PLANNING",
    progress: progress || 0,
  };

  // Only send score if it's a valid number
  if (score != null && score > 0) {
    variables.score = score;
  }

  try {
    const res = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${anilistToken}`,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const json = await res.json();
    if (json.errors) {
      console.error("AniList sync error:", json.errors[0].message);
      return null;
    }
    return json.data.SaveMediaListEntry;
  } catch (err) {
    console.error("AniList sync failed:", err);
    return null;
  }
}

/**
 * Deletes an anime entry from the user's real AniList account.
 */
export async function deleteFromAniList(anilistToken, mediaId) {
  if (!anilistToken) return null;

  // First we need the list entry ID for this media
  const query = `
    query ($mediaId: Int) {
      Media(id: $mediaId) {
        mediaListEntry {
          id
        }
      }
    }
  `;

  try {
    const entryRes = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${anilistToken}`,
      },
      body: JSON.stringify({ query, variables: { mediaId } }),
    });

    const entryJson = await entryRes.json();
    const entryId = entryJson?.data?.Media?.mediaListEntry?.id;
    if (!entryId) return null; // Not on their list, nothing to delete

    const mutation = `
      mutation ($id: Int) {
        DeleteMediaListEntry(id: $id) {
          deleted
        }
      }
    `;

    const delRes = await fetch(ANILIST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${anilistToken}`,
      },
      body: JSON.stringify({ query: mutation, variables: { id: entryId } }),
    });

    const delJson = await delRes.json();
    return delJson?.data?.DeleteMediaListEntry?.deleted;
  } catch (err) {
    console.error("AniList delete failed:", err);
    return null;
  }
}
