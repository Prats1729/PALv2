/**
 * Service to automatically map AniList episode numbers to Scraper / TVDB episode numbers
 * Uses the open AniZip mapping database (https://api.ani.zip)
 */

const mappingCache = new Map();

/**
 * Fetch episode mapping for an AniList anime ID
 * @param {number|string} anilistId
 * @returns {Promise<{ getTargetEpisode: (aniListEp: number) => number, getSeasonEpisode: (scraperEp: number) => number, offset: number, raw: object }>}
 */
export async function getAnimeEpisodeMapping(anilistId) {
  if (!anilistId) return null;
  const idStr = String(anilistId);

  if (mappingCache.has(idStr)) {
    return mappingCache.get(idStr);
  }

  try {
    const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${idStr}`);
    if (!res.ok) {
      mappingCache.set(idStr, null);
      return null;
    }

    const data = await res.json();
    const episodes = data.episodes || {};

    // Check first episode mapping to deduce default offset
    const firstEpData = episodes["1"] || episodes[1];
    const firstScraperEp = firstEpData?.episodeNumber || 1;
    const deducedOffset = Math.max(0, firstScraperEp - 1);

    const mappingResult = {
      offset: deducedOffset,
      episodeCount: data.episodeCount || Object.keys(episodes).length,
      mappings: data.mappings || {},
      raw: data,

      /**
       * Returns the exact scraper episode number for a given AniList season episode
       */
      getTargetEpisode(seasonEp) {
        const epKey = String(seasonEp);
        if (episodes[epKey] && episodes[epKey].episodeNumber) {
          return episodes[epKey].episodeNumber;
        }
        return seasonEp + deducedOffset;
      },

      /**
       * Converts a scraper episode number back to the AniList season episode number
       */
      getSeasonEpisode(scraperEp) {
        // First try finding an exact match in mapped episodes
        for (const [aniListKey, epData] of Object.entries(episodes)) {
          if (epData.episodeNumber === scraperEp) {
            const parsed = parseInt(aniListKey);
            if (!isNaN(parsed)) return parsed;
          }
        }
        return Math.max(1, scraperEp - deducedOffset);
      },
    };

    mappingCache.set(idStr, mappingResult);
    return mappingResult;
  } catch (err) {
    console.warn(`[AnimeMapping] Failed to fetch mapping for ${anilistId}:`, err);
    return null;
  }
}
