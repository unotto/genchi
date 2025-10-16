import React, { useEffect, useState } from "react";
import Current from "../components/ui/Current";
import SwipeActionsList from "../components/SwipeActionsList";
import { loadHistory, saveHistory } from "../lib/history";

/**
 * ペア履歴ページ：
 * - localStorage の履歴を読み込んで SwipeActionsList に表示
 * - SwipeActionsList 側で削除/並べ替えしたら保存
 */
export default function Pair() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(loadHistory());
  }, []);

  const handleDelete = (rowOrIndex) => {
    // SwipeActionsList の実装次第で渡ってくる形が違うので両対応:
    // row: {id, ...} or index
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
    setItems(next);
    saveHistory(next);
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
