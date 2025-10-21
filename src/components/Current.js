import React from "react";
export default function Current({ title, className }) {
  return (
    <header style={{ marginBottom: 12 }} className={className}>
      <h1 style={{ fontSize: "1.125rem", fontWeight: 700 }}>{title}</h1>
    </header>
  );
}
