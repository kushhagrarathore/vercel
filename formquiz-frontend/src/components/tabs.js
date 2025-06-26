// src/components/tabs.js
import React, { useState, createContext, useContext } from "react";
import "./tabs.css";

const TabsContext = createContext();

export function Tabs({ defaultValue, value, onValueChange, children }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;

  const handleChange = (val) => {
    if (onValueChange) onValueChange(val);
    else setInternalValue(val);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onChange: handleChange }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }) {
  return <div className="tabs-list">{children}</div>;
}

export function TabsTrigger({ value, children }) {
  const { value: currentValue, onChange } = useContext(TabsContext);
  const isActive = currentValue === value;

  return (
    <button
      className={`tabs-trigger ${isActive ? "active" : ""}`}
      onClick={() => onChange(value)}
    >
      {children}
    </button>
  );
}
