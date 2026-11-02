// AniList API Service
import { request, gql } from "graphql-request";

// anilist api endpoint
const endpoint = "https://graphql.anilist.co/";

// gql accepts '$search' string parameter
// 1. Define the search query
const SEARCH_QUERY = gql`
    query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage){
            pageInfo {
                total
                hasNextPage
                currentPage
            }
            media(search: $search, type: ANIME){
             id
             title{
                english
                romaji
                native
             }
            coverImage {
                large
                color
            }
            description(asHtml: false)
            averageScore
            episodes
            format
            status
            nextAiringEpisode{
                episode
            }
            genres
            tags {
                name
                isMediaSpoiler
                isGeneralSpoiler
            }
            characters(sort: [ROLE, RELEVANCE], perPage: 6) {
                edges {
                    node {
                        id
                    }
                    voiceActors(language: ENGLISH) {
                        id
                    }
                }
            }
            }
        }}
`;

/**
 * Fetches anime results from the AniList API based on a search term.
 */

export async function searchAnime(query, page = 1, perPage = 12){
    // input check
    if (!query || query.trim() === '') return [];

    const variables = {
        search: query,
        page,
        perPage
    };

    try{
        const data = await request(endpoint, SEARCH_QUERY, variables);
        return { media: data.Page.media, pageInfo: data.Page.pageInfo };
    
    } catch (error){
        console.error("Error fetching data:", error);
        throw error;
    }
}

const ANILIST_API_URL = "https://graphql.anilist.co/";

const GET_USER_WATCHLIST_QUERY = `
  query ($username: String) {
    MediaListCollection(userName: $username, type: ANIME) {
      lists {
        name
        status
        entries {
          id
          progress
          score
          media {
            id
            title {
              userPreferred
              romaji
              english
            }
            coverImage {
              medium
              large
              color
            }
            episodes
          }
        }
      }
    }
  }
`;

export async function fetchUserWatchlist(username) {
  const response = await fetch(ANILIST_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: GET_USER_WATCHLIST_QUERY,
      variables: { username },
    }),
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(json.errors[0].message);
  }

  return json.data.MediaListCollection.lists;
}

const BRIEF_QUERY = gql`
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      description(asHtml: false)
      genres
      format
      status
      averageScore
      episodes
      tags {
        name
        isMediaSpoiler
        isGeneralSpoiler
      }
      characters(sort: [ROLE, RELEVANCE], perPage: 6) {
        edges {
          node {
            id
          }
          voiceActors(language: ENGLISH) {
            id
          }
        }
      }
    }
  }
`;

const briefCache = new Map();

export async function fetchAnimeBrief(id) {
  if (!id) return null;
  if (briefCache.has(id)) return briefCache.get(id);
  try {
    const data = await request(endpoint, BRIEF_QUERY, { id });
    if (data?.Media) {
      briefCache.set(id, data.Media);
      return data.Media;
    }
  } catch (e) {
    // Return null silently on network error
  }
  return null;
}

const RANDOM_BATCH_QUERY = gql`
  query ($id_in: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $id_in, type: ANIME, isAdult: false) {
        id
      }
    }
  }
`;

/**
 * Fetches a genuinely random anime from the entire AniList catalog (not biased to popular).
 * AniList uses sequential IDs up to ~220,000 across all media (anime, manga, specials).
 * We generate batches of truly random IDs across the entire span and query in a single
 * network call using `id_in`. Any valid anime returned is randomly selected.
 */
export async function fetchRandomAnime(maxAttempts = 3) {
  const MAX_ANILIST_ID = 220000;
  const BATCH_SIZE = 60;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate 60 completely random uniform ID candidates
    const randomIds = Array.from(
      { length: BATCH_SIZE },
      () => Math.floor(Math.random() * MAX_ANILIST_ID) + 1
    );

    try {
      const data = await request(endpoint, RANDOM_BATCH_QUERY, { id_in: randomIds });
      const mediaList = data?.Page?.media || [];
      if (mediaList.length > 0) {
        // Pick one completely at random from the matched valid anime
        const picked = mediaList[Math.floor(Math.random() * mediaList.length)];
        return picked.id;
      }
    } catch (err) {
      console.warn(`Random anime attempt ${attempt + 1} failed:`, err);
    }
  }

  // Robust fallback: Pick a completely random page with uniform ID sorting
  try {
    const fallbackPage = Math.floor(Math.random() * 5000) + 1;
    const fallbackQuery = gql`
      query ($page: Int) {
        Page(page: $page, perPage: 1) {
          media(type: ANIME, sort: [ID], isAdult: false) {
            id
          }
        }
      }
    `;
    const fallbackData = await request(endpoint, fallbackQuery, { page: fallbackPage });
    return fallbackData?.Page?.media?.[0]?.id || null;
  } catch (e) {
    console.error("fetchRandomAnime fallback failed:", e);
    return null;
  }
}




/**
 * Fetches AniList's direct peer recommendations for an anime.
 */
const ANIME_RECOMMENDATIONS_QUERY = gql`
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title {
        romaji
        english
      }
      recommendations(perPage: 8, sort: [RATING_DESC]) {
        nodes {
          mediaRecommendation {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              color
            }
            description(asHtml: false)
            averageScore
            episodes
            format
            status
            genres
            tags {
              name
              isMediaSpoiler
              isGeneralSpoiler
            }
          }
        }
      }
    }
  }
`;

export async function fetchAnimeRecommendations(id) {
  if (!id) return [];
  try {
    const data = await request(endpoint, ANIME_RECOMMENDATIONS_QUERY, { id });
    const nodes = data?.Media?.recommendations?.nodes || [];
    return nodes
      .map(n => n.mediaRecommendation)
      .filter(m => Boolean(m && m.id));
  } catch (err) {
    console.warn("fetchAnimeRecommendations error:", err);
    return [];
  }
}

/**
 * Fetches high-rated catalog titles for given genres or tags (excluding already watched ones).
 */
const GENRE_RECOMMENDATIONS_QUERY = gql`
  query ($genre_in: [String], $tag_in: [String], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(genre_in: $genre_in, tag_in: $tag_in, type: ANIME, isAdult: false, sort: [SCORE_DESC, POPULARITY_DESC]) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          large
          color
        }
        description(asHtml: false)
        averageScore
        episodes
        format
        status
        genres
        tags {
          name
          isMediaSpoiler
          isGeneralSpoiler
        }
      }
    }
  }
`;

const ANILIST_STANDARD_GENRES = new Set([
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy",
  "Horror", "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological",
  "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"
]);

export async function fetchGenreRecommendations(genres, page = 1, perPage = 12) {
  if (!genres || genres.length === 0) return [];
  try {
    const isStandard = genres.every(g => ANILIST_STANDARD_GENRES.has(g));
    const variables = {
      page,
      perPage,
      ...(isStandard ? { genre_in: genres } : { tag_in: genres })
    };
    const data = await request(endpoint, GENRE_RECOMMENDATIONS_QUERY, variables);
    return data?.Page?.media || [];
  } catch (err) {
    console.warn("fetchGenreRecommendations error:", err);
    return [];
  }
}
