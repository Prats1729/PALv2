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