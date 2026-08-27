const ANILIST_STATUS_MAP = {
  CURRENT: "Watching",
  COMPLETED: "Completed",
  PAUSED: "On Hold",
  DROPPED: "Dropped",
  PLANNING: "Plan to Watch",
  REPEATING: "Watching",
};

async function importAniListWatchlist(userId, anilistToken, Watchlist) {
  try {
    // 1. Get Viewer ID
    const viewerQuery = `
      query {
        Viewer {
          id
        }
      }
    `;
    const viewerRes = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anilistToken}`,
      },
      body: JSON.stringify({ query: viewerQuery }),
    });

    const viewerJson = await viewerRes.json();
    if (viewerJson.errors || !viewerJson.data?.Viewer?.id) {
      throw new Error("Invalid or expired AniList token");
    }

    const viewerId = viewerJson.data.Viewer.id;

    // 2. Fetch full MediaListCollection for this user
    const listQuery = `
      query ($userId: Int) {
        MediaListCollection(userId: $userId, type: ANIME) {
          lists {
            name
            status
            isCustomList
            entries {
              status
              progress
              score(format: POINT_10_DECIMAL)
              media {
                id
                title { english romaji }
                coverImage { large color }
                episodes
              }
            }
          }
        }
      }
    `;

    const listRes = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anilistToken}`,
      },
      body: JSON.stringify({ query: listQuery, variables: { userId: viewerId } }),
    });

    const listJson = await listRes.json();
    if (listJson.errors || !listJson.data?.MediaListCollection?.lists) {
      throw new Error("Failed to fetch AniList collection");
    }

    const lists = listJson.data.MediaListCollection.lists;
    const seenAnimeIds = new Set();
    let imported = 0;
    let updated = 0;

    for (const list of lists) {
      const fallbackListStatus = ANILIST_STATUS_MAP[list.status] || "Plan to Watch";

      for (const entry of list.entries || []) {
        const media = entry.media;
        if (!media || !media.id) continue;

        const isNewToBatch = !seenAnimeIds.has(media.id);
        seenAnimeIds.add(media.id);

        // Use entry-level status first (accurate for custom lists), then fallback to list status
        const resolvedRawStatus = entry.status || list.status;
        let palStatus = ANILIST_STATUS_MAP[resolvedRawStatus] || fallbackListStatus;

        // If completed episodes match total, mark as Completed
        if (media.episodes && entry.progress >= media.episodes) {
          palStatus = "Completed";
        }

        const updateData = {
          userId,
          animeId: media.id,
          title: media.title.english || media.title.romaji || "Unknown",
          coverImage: media.coverImage.large,
          color: media.coverImage.color || "#6366f1",
          status: palStatus,
          progress: entry.progress || 0,
          totalEpisodes: media.episodes || null,
          rating: entry.score || null,
          updatedAt: new Date()
        };

        const result = await Watchlist.findOneAndUpdate(
          { animeId: media.id, userId },
          { $set: updateData },
          { upsert: true, returnDocument: 'before' }
        );

        if (isNewToBatch) {
          if (result) {
            updated++;
          } else {
            imported++;
          }
        }
      }
    }

    return { imported, updated, total: seenAnimeIds.size };
  } catch (err) {
    console.error("anilistImporter error:", err);
    throw err;
  }
}

module.exports = { importAniListWatchlist };
