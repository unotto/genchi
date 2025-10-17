import React, { useEffect, useRef, useState, useCallback } from "react";
import styles from "./SwipeActionsList.module.css";
import Sortable from "sortablejs";

import dots from "../img/dot.webp";
import trashHint from "../img/rubbish-h-icon.webp";
import trashSolid from "../img/rubbish-icon.webp";
import batu from "../img/batu.webp";

const DELETE_WIDTH = 80;
const THRESHOLD = DELETE_WIDTH * 0.4;

export default function SwipeActionsList({ items = [], onDelete, onReorder }) {
  const [rows, setRows] = useState(items);
  useEffect(() => setRows(items), [items]);

  const listRef = useRef(null);
  const rowRefs = useRef({});
  const [swipeState, setSwipeState] = useState(null);
  const [leavingIds, setLeavingIds] = useState([]);

  // 並べ替え（ハンドル限定 / iOS対応）
  useEffect(() => {
    if (!listRef.current) return;

    const sortable = Sortable.create(listRef.current, {
      animation: 150,
      handle: `.${styles.swl__handle}`,    // ハンドルでのみドラッグ開始
      draggable: `.${styles.swl__row}`,
      direction: "vertical",
      ghostClass: styles.dragging,

      // iOS / 非Chrome 安定化
      forceFallback: true,
      fallbackOnBody: true,
      touchStartThreshold: 1,
      fallbackTolerance: 2,
      delayOnTouchOnly: false,
      delay: 0,
      setData: (dt) => { try { dt.setData("text/plain", ""); } catch (_) {} },

      // ← ここにあった cancel は削除（ハンドル内のimgタップもドラッグ可にする）
      // preventOnFilter も不要

      onStart() {
        Object.values(rowRefs.current).forEach((el) => { if (el) el.style.transition = "none"; });
      },
      onEnd: (evt) => {
        const from = evt.oldIndex, to = evt.newIndex;
        if (from === to || from == null || to == null) return;
        setRows((prev) => {
          const next = [...prev];
          const [m] = next.splice(from, 1);
          next.splice(to, 0, m);
          onReorder && onReorder(next);
          return next;
        });
      },
    });

    return () => sortable.destroy();
  }, [onReorder]);

  // ====== スワイプ（削除ボタン表示） ======
  const getCurrentX = (el) => {
    if (!el) return 0;
    const m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(el.style.transform || "");
    if (m) return parseFloat(m[1]);
    const num = parseFloat((el.style.transform || "").replace(/[^0-9-.]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const handleTouchMove = useCallback((e) => {
    if (!swipeState) return;
    const p = e.touches ? e.touches[0] : e;
    const deltaX = p.clientX - swipeState.startX;
    if (Math.abs(deltaX) > 10) e.preventDefault(); // 横移動中は縦スクロール抑止

    let x = swipeState.initialTranslateX + deltaX;
    if (x > 0) x = Math.min(0, x / 4);
    if (x < -DELETE_WIDTH) x = -DELETE_WIDTH + (x + DELETE_WIDTH) / 4;

    const el = rowRefs.current[swipeState.activeId];
    if (el) el.style.transform = `translateX(${x}px)`;
  }, [swipeState]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeState) return;
    const el = rowRefs.current[swipeState.activeId];
    if (!el) return;

    const currentX = getCurrentX(el);
    const moved = currentX - swipeState.initialTranslateX;
    let finalX = 0;
    if (moved <= -10 || currentX < -THRESHOLD) finalX = -DELETE_WIDTH;
    else if (moved >= 10) finalX = 0;
    else finalX = currentX < -THRESHOLD ? -DELETE_WIDTH : 0;

    el.style.transition = "transform .25s ease-out";
    el.style.transform = `translateX(${finalX}px)`;

    setSwipeState(null);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
    window.removeEventListener("mousemove", handleTouchMove);
    window.removeEventListener("mouseup", handleTouchEnd);

    setTimeout(() => { if (el) el.style.transition = "none"; }, 260);
  }, [swipeState, handleTouchMove]);

  useEffect(() => {
    if (!swipeState) return;
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("mousemove", handleTouchMove);
    window.addEventListener("mouseup", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("mousemove", handleTouchMove);
      window.removeEventListener("mouseup", handleTouchEnd);
    };
  }, [swipeState, handleTouchMove, handleTouchEnd]);

  const startSwipe = (e, rowId) => {

    // ハンドル上はスワイプ開始しない（ドラッグ専用）
    if (e.target.closest(`.${styles.swl__handle}`)) return;
    const p = e.touches ? e.touches[0] : e;
    const startX = p.clientX;
    const el = rowRefs.current[rowId];
    const initialX = el ? getCurrentX(el) : 0;
    if (el) el.style.transition = "none";
    setSwipeState({ startX, activeId: rowId, initialTranslateX: initialX });
  };

  // ====== 削除アニメーション ======
  function deleteRowSmooth(rowId, idx) {
    setLeavingIds((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
    setTimeout(() => {
      setRows((prev) => prev.filter((_, i) => i !== idx));
      onDelete && onDelete(idx);
      setLeavingIds((prev) => prev.filter((id) => id !== rowId));
    }, 300);
  }

  // ====== モーダル ======
  const [open, setOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openPopup = (row) => { setActiveRow(row); setOpen(true); };
  const closePopup = () => setOpen(false);

  return (
    <>
      <ul className={styles.swl} ref={listRef}>
        {rows.map((row, idx) => {
          const rowId = row.id ?? idx;
          return (
            <li
              className={`${styles.swl__row} ${leavingIds.includes(rowId) ? styles.isLeaving : ""}`}
              key={rowId}
            >
              <button
                className={styles.swl__deleteAction}
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteRowSmooth(rowId, idx); }}
              >
                <img src={trashSolid} alt="削除" />
              </button>

              <div
                className={styles.swl__swipeableContent}
                ref={(el) => (rowRefs.current[rowId] = el)}
                onTouchStart={(e) => startSwipe(e, rowId)}
                onMouseDown={(e) => startSwipe(e, rowId)}
              >
                <div className={styles.swl__grid}>
                    <button
                      className={styles.swl__handle}
                      type="button"
                      title="ドラッグで並べ替え"
                      onTouchStart={(e) => { e.preventDefault(); /* iOSでD&Dを最優先 */ }}
                      onMouseDown={(e) => { e.preventDefault(); /* PCでもドラッグ開始を確実に */ }}
                    >
                    <img src={dots} alt="" aria-hidden="true" />
                  </button>

                  <div className={styles.swl__body}>
                    {row.date && <div className={styles.swl__date}>{row.date}</div>}
                    <button
                      type="button"
                      className={styles.swl__bodyBtn}
                      onClick={(e) => { e.stopPropagation(); openPopup(row); }}
                      aria-label="内容を開く"
                    >
                      <div className={styles.swl__contentMask}>
                        <div className={styles.swl__line}>
                          <span className={`${styles.swl__money} ${styles.em}`}>{row.left}</span>
                          <span className={styles.swl__arrow}>→</span>
                          <span className={`${styles.swl__money} ${styles.em}`}>{String(row.right).split("\n")[0]}</span>
                        </div>
                        {row.memo && <p className={styles.swl__memo} title={row.memo}>{row.memo}</p>}
                      </div>
                    </button>
                  </div>

                  <div className={styles.swl__hint} aria-hidden="true">
                    <img src={trashHint} alt="" />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {open && activeRow && (
        <div className={styles.modalOverlay} role="presentation" onClick={closePopup}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="詳細表示" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={styles.modalClose} aria-label="閉じる" onClick={closePopup}>
              <img src={batu} alt="" />
            </button>
            <div className={styles.modalScroll}>
              <div className={styles.modalLine} style={{ display:"grid", placeItems:"center", textAlign:"center", gap:6, marginBottom:10 }}>
                <div className={styles.modalMoney}>{activeRow.left}</div>
                <div className={styles.modalArrow}>↓</div>
                <div className={styles.modalMoney} style={{ fontWeight:700, color:"#0077B6" }}>
                  {safeLine(activeRow.right, 0)}
                  <br />
                  <small style={{ color:"#6B7280", fontSize:"0.6em" }}>（{safeLine(activeRow.right, 1)}）</small>
                </div>
              </div>
              {activeRow.memo && <p className={styles.modalMemo}>{activeRow.memo}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function safeLine(text, index) {
  if (!text) return "";
  const parts = String(text).split("\n");
  return parts[index] || "";
}
