import React, { useEffect, useState } from "react";
import Current from "../components/ui/Current";
import SwipeActionsList from "../components/SwipeActionsList";
import { loadHistory, saveHistory } from "../lib/history";

// 安定ID付与（id が無い行にだけ付与）
function withStableIds(arr) {
  return (arr || []).map((row, i) => {
<div style={{position:'sticky',top:0,zIndex:9999,background:'#111',color:'#0f0',padding:'6px 10px',fontSize:12}}>
  PAIR-VERSION: 20251018-TEST
</div>


    if (row && row.id != null) return row;
    // 既存の2項目からハッシュっぽいものを作る（衝突しても idx をサフィックス）
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
    // next は SwipeActionsList が返す新しい並び
    const normalized = withStableIds(next); // 念のため
    setItems(normalized);
    saveHistory(normalized);
  };

  return (
    <section>
      <div className="page-body2">
        <Current title="ペア履歴" className="pair" />
        <SwipeActionsList
          items={items}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      </div>
    </section>
  );
}
