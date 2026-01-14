import React from "react";
import { Search } from "lucide-react";
import "./SearchBar.css";

const SearchBar = ({ 
  value, 
  onChange, 
  placeholder = "Search...",
  className = ""
}) => {
  return (
    <div className={`search-bar ${className}`}>
      <Search className="search-icon" size={20} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
      />
    </div>
  );
};

export default SearchBar;
