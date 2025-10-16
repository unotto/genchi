import React from "react";

export default function Field({ as: Tag = "div", className = "", children }) {
  return <Tag className={`field ${className}`.trim()}>{children}</Tag>;
}