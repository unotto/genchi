import React, { useEffect, useState } from "react";
import Current from "../components/ui/Current";
import SwipeActionsList from "../components/SwipeActionsList";
import { loadHistory, saveHistory } from "../lib/history";

function withStableIds(arr) {
  return (arr || []).map((row, i) => {
    if (row && row.id != null) return row;
    const seed = `${row?.date || ""}|${row?.left || ""}|${row?.right || ""}|${row?.memo || ""}`;
    const h = Array.from(seed).reduce((s, c) => ((s << 5) - s) + c.charCodeAt(0) | 0, 0);
    return { ...row, id: `${h}_${i}` };
  });
}

export default function Pair() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const init = withStableIds(loadHistory());
    setItems(init);
  }, []);

  const handleDelete = (rowOrIndex) => {
    setItems((prev) => {
      let next = [];
      if (typeof rowOrIndex === "number") {
        next = prev.filter((_, i) => i !== rowOrIndex);
      } else if (rowOrIndex && rowOrIndex.id) {
        next = prev.filter((it) => it.id !== rowOrIndex.id);
      } else {
        return prev;
      }
      saveHistory(next);
      return next;
    });
  };

  const handleReorder = (next) => {
    const normalized = withStableIds(next);
    setItems(normalized);
    saveHistory(normalized);
  };

  return (
    <section>
      <div className="page-body2">
        <Current title="ペア履歴" className="pair" />
        <SwipeActionsList items={items} onDelete={handleDelete} onReorder={handleReorder} />
      </div>
    </section>
  );
}
