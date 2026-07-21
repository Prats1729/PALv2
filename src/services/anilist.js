// AniList API Service
import { request, gql } from "graphql-request";

// anilist api endpoint
const endpoint = "https://graphql.anilist.co/";

// gql accepts '$search' string parameter
// 1. Define the search query
const SEARCH_QUERY = gql`
    query ($search: String, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage){
            media(search: $search, type: ANIME){
             id
             title{
                english
                romaji
                native
             }
            coverImage {
                large
            }
            description
            averageScore
            episodes
            format
            status
            nextAiringEpisode{
                episode
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
        return data.Page.media;
    
    } catch (error){
        console.error("Error fetching data:", error);
        throw error;
    }
}

const ANILIST_API_URL = "https://graphql.anilist.co";

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
