import { useState, useEffect } from "react";

import TopBar from "./components/layout/TopBar";
import "./App.css";



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
