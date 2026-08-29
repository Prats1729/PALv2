/**
 * Service to automatically map AniList episode numbers to Scraper / TVDB episode numbers
 * Uses the open AniZip mapping database (https://api.ani.zip)
 */

const mappingCache = new Map();

/**
 * Clean and normalize anime title for better ani-cli / scraper search matching
 * @param {string} title 
 * @returns {string}
 */
export function cleanAnimeTitle(title) {
  if (!title) return "";
  return title
    .replace(/[–—]/g, "-") // normalize unicode dashes
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate sensible alternative search titles for an anime
 * @param {object} anime AniList media object
 * @param {object} aniZipData AniZip raw data (optional)
 * @returns {string[]} List of unique title suggestions
 */
export function getSuggestedTitles(anime, aniZipData = null) {
  const titles = new Set();
  
  if (anime?.title?.english) titles.add(cleanAnimeTitle(anime.title.english));
  if (anime?.title?.romaji) titles.add(cleanAnimeTitle(anime.title.romaji));

  if (aniZipData?.titles) {
    if (aniZipData.titles.en) titles.add(cleanAnimeTitle(aniZipData.titles.en));
    if (aniZipData.titles['x-jat']) titles.add(cleanAnimeTitle(aniZipData.titles['x-jat']));
  }

  // Simplified title: remove long subtitles in dashes or parentheses
  if (anime?.title?.english) {
    const simplified = anime.title.english
      .replace(/\s*–\s*.*?\s*–/g, "")
      .replace(/\s*-\s*Starting Life in Another World\s*-\s*/i, " ")
      .replace(/\s*-\s*The Separation\s*/i, "")
      .replace(/\s*-\s*The Conflict\s*/i, "")
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (simplified && simplified.length >= 3) {
      titles.add(simplified);
    }
  }

  return Array.from(titles).filter(Boolean);
}

/**
 * Fetch episode mapping for an AniList anime ID
 * @param {number|string} anilistId
 * @returns {Promise<{ 
 *   offset: number, 
 *   absoluteOffset: number, 
 *   episodeCount: number, 
 *   titles: string[], 
 *   getTargetEpisode: (aniListEp: number, useAbsolute?: boolean) => number, 
 *   getSeasonEpisode: (scraperEp: number, totalEpisodes?: number) => number, 
 *   raw: object 
 * } | null>}
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

    // Check first episode mapping
    const firstEpData = episodes["1"] || episodes[1];
    const firstScraperEp = firstEpData?.episodeNumber || 1;
    const firstAbsEp = firstEpData?.absoluteEpisodeNumber || 1;

    const tvdbOffset = Math.max(0, firstScraperEp - 1);
    const absOffset = Math.max(0, firstAbsEp - 1);

    const mappingResult = {
      offset: tvdbOffset,
      absoluteOffset: absOffset,
      episodeCount: data.episodeCount || Object.keys(episodes).length,
      mappings: data.mappings || {},
      raw: data,

      /**
       * Returns the exact scraper episode number for a given AniList season episode
       */
      getTargetEpisode(seasonEp, useAbsolute = false) {
        const epKey = String(seasonEp);
        const epData = episodes[epKey];
        if (epData) {
          if (useAbsolute && epData.absoluteEpisodeNumber) {
            return epData.absoluteEpisodeNumber;
          }
          if (epData.episodeNumber) {
            return epData.episodeNumber;
          }
        }
        return seasonEp + (useAbsolute ? absOffset : tvdbOffset);
      },

      /**
       * Converts a scraper episode number back to the AniList season episode number
       */
      getSeasonEpisode(scraperEp, totalEpisodes = null) {
        if (!scraperEp || isNaN(scraperEp)) return 1;

        // If it already falls within season boundaries and offset is 0, it's directly the season ep
        if (totalEpisodes && scraperEp <= totalEpisodes && tvdbOffset === 0 && absOffset === 0) {
          return scraperEp;
        }

        // 1. Check exact episodeNumber match
        for (const [aniListKey, epData] of Object.entries(episodes)) {
          if (epData.episodeNumber === scraperEp) {
            const parsed = parseInt(aniListKey);
            if (!isNaN(parsed)) return parsed;
          }
        }

        // 2. Check exact absoluteEpisodeNumber match
        for (const [aniListKey, epData] of Object.entries(episodes)) {
          if (epData.absoluteEpisodeNumber === scraperEp) {
            const parsed = parseInt(aniListKey);
            if (!isNaN(parsed)) return parsed;
          }
        }

        // 3. Fallback using offset
        if (absOffset > 0 && scraperEp > absOffset) {
          return Math.max(1, scraperEp - absOffset);
        }
        if (tvdbOffset > 0 && scraperEp > tvdbOffset) {
          return Math.max(1, scraperEp - tvdbOffset);
        }

        return Math.max(1, scraperEp);
      },
    };

    mappingCache.set(idStr, mappingResult);
    return mappingResult;
  } catch (err) {
    console.warn(`[AnimeMapping] Failed to fetch mapping for ${anilistId}:`, err);
    return null;
  }
}
