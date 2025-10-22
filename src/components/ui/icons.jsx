import React from "react";

export const DotsIcon = (props) => (
  <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden="true" {...props}>
    <circle cx="2" cy="2" r="2" />
    <circle cx="8" cy="2" r="2" />
    <circle cx="2" cy="8" r="2" />
    <circle cx="8" cy="8" r="2" />
    <circle cx="2" cy="14" r="2" />
    <circle cx="8" cy="14" r="2" />
  </svg>
);

export const TrashHintIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path opacity=".55" d="M9 3h6l1 2h5v2H3V5h5l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9z" />
  </svg>
);

export const TrashSolidIcon = (props) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true" {...props}>
    <path d="M6 7h12l-1 14H7L6 7zm8-4h-4l-1 2H5v2h14V5h-4l-1-2z"/>
  </svg>
);

export const CloseIcon = (props) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18 6L6 18M6 6l12 12" stroke="#444" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
