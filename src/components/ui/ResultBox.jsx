import React from "react";

export default function ResultBox({ id = "result", value, placeholder }) {
  return (
    <div id={id} className="result-box like-input" aria-live="polite">
      {value ? (
        <span className="result-value">{value}</span>
      ) : (
        <span className="placeholder">{placeholder}</span>
      )}
    </div>
  );
}
