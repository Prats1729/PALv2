import { useState, useEffect } from "react";
import { request, gql } from "graphql-request";
import TopBar from "./components/TopBar";
import "./App.css";

// anilist api endpoint
const endpoint = "https://graphql.anilist.co/";

// gql accepts '$search' string parameter

const SEARCH_QUERY = gql`
  
`

export default function App() {
  // state for the query in the search box
  const [query, setQuery] = useState("");

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    console.log("App received search query:", searchQuery);
  };

  return (
    <div>
      <TopBar onSearch={handleSearch} />
      <div style={{ marginTop: "80px", padding: "20px", color: "white" }}>
        {query ? <p>Search results for: {query}</p> : null}
      </div>
    </div>
  );
}
