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

