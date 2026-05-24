import { useState, useEffect } from "react";
import { request, gql } from "graphql-request";
const endpoint = "https://graphql.anilist.co";
const TRENDING_QUERY = gql`
  query {
    Page(page: 1, perPage: 10) {
      media(sort: TRENDING_DESC, type: ANIME) {
        id
        title {
          english
          romaji
          native
        }
        coverImage {
          large
        }
        description
      }
    }
  }
`;
export default function App() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await request(endpoint, TRENDING_QUERY, {
          "X-Client-ID": "42196",
        });
        setTrending(data.Page.media);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  return (
    <div>
      <h1>Trending Anime</h1>
      <ul>
        {trending.map((anime) => (
          <li key={anime.id}>
            <h3>{anime.title.english}</h3>
            <img
              src={anime.coverImage.large}
              alt={anime.title.native}
              width="100"
            />
            <p>{anime.description?.substring(0, 100)}...</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
