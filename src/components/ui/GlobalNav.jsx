import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function GlobalNav() {
  const { pathname } = useLocation();
  const active = (p) => (pathname === p ? { fontWeight: 700, textDecoration: "underline" } : null);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "#fff", borderBottom: "1px solid #eee",
      padding: "10px 16px", display: "flex", gap: 16, alignItems: "center"
    }}>
      <strong style={{ marginRight: 12 }}>Genchi</strong>
      <Link to="/" style={active("/")}>ペア履歴</Link>
      {/* 必要なら他ページのリンクを増やす */}
      <div style={{ marginLeft: "auto", opacity: .7, fontSize: 12 }}>{pathname}</div>
    </nav>
  );
}
