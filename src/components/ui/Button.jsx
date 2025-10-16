import React from "react";

export default function Button({ variant = "primary", className = "", children, ...rest }) {
  const cls = `btn ${variant === "outline" ? "btn-outline" : "btn-primary"} ${className}`.trim();
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}