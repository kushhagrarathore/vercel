// src/components/buttonquiz.js
import React from "react";
import "./buttonquiz.css";

export function Button({ children, className = "", ...props }) {
  return (
    <button className={`btn btn-default ${className}`} {...props}>
      {children}
    </button>
  );
}
