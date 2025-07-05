import React from "react";
import "./progress.css"; // Import the CSS

export function Progress({ value = 0 }) {
  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${value}%` }}></div>
    </div>
  );
}
