// src/components/button.js
import React from "react";
import "./buttonquiz.css";

export function Button({ children, variant = "default", className = "", ...props }) {
  return (
    <button className={`btn btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
