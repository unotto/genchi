import React, { useEffect, useState } from "react";
import Current from "../components/ui/Current";
import SwipeActionsList from "../components/SwipeActionsList";
import { loadHistory, saveHistory } from "../lib/history";

export default function Pair() {
  const [items, setItems] = useState([]);

  useEffect(() => { setItems(loadHistory()); }, []);

  const handleDelete = (rowOrIndex) => {
    setItems((prev) => {
      let next = [];
      if (typeof rowOrIndex === "number") {
        next = prev.filter((_, i) => i !== rowOrIndex);
      } else if (rowOrIndex && rowOrIndex.id != null) {
        next = prev.filter((it) => (it.id ?? it._idx) !== (rowOrIndex.id ?? rowOrIndex._idx));
      } else {
        return prev;
      }
      saveHistory(next);
      return next;
    });
  };

  const handleReorder = (next) => { setItems(next); saveHistory(next); };

  return (
    <section>
      <div className="page-body2">
        <Current title="ペア履歴" className="pair" />
        <SwipeActionsList items={items} onDelete={handleDelete} onReorder={handleReorder} />
      </div>
    </section>
  );
}
