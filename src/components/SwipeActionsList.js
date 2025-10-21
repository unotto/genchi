import React, { useEffect, useRef, useState } from "react";
import styles from "./SwipeActionsList.module.css";
import Sortable from "sortablejs";

import dots from "../img/dot.webp";
import trashHint from "../img/rubbish-h-icon.webp";
import trashSolid from "../img/rubbish-icon.webp";
import batu from "../img/batu.webp";

const DELETE_WIDTH = 80;
const THRESHOLD = DELETE_WIDTH * 0.4;

const isTouchDevice =
  typeof window !== "undefined" &&
  ("ontouchstart" in window ||
   (navigator && navigator.maxTouchPoints > 0) ||
   (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));

export default function SwipeActionsList({ items = [], onDelete, onReorder }) {
  const [rows, setRows] = useState(items);
  useEffect(() => setRows(items), [items]);

  const rowsRef = useRef(items);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const listRef = useRef(null);
  const sortableRef = useRef(null);
  const rowRefs = useRef({});
  const swipeRef = useRef(null);

  const [leavingIds, setLeavingIds] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

  // ===== Sortable：iOS/Androidだけ forceFallback、PC はネイティブDnD =====
  useEffect(() => {
    if (!listRef.current) return;

    const sortable = Sortable.create(listRef.current, {
      animation: 150,
      handle: `.${styles.swl__handle}`,
      draggable: `.${styles.swl__row}`,
      direction: "vertical",
      ghostClass: styles.dragging,

      forceFallback: isTouchDevice,          // ← ここをデバイスで分岐
      fallbackOnBody: true,
      touchStartThreshold: 1,
      fallbackTolerance: 2,
      delayOnTouchOnly: false,
      delay: 0,
      setData: (dt) => { try { dt.setData("text/plain", ""); } catch (_) {} },

      onStart() {
        console.log("[genchi] sortable onStart");
        Object.values(rowRefs.current).forEach((el) => { if (el) el.style.transition = "none"; });
      },
      onEnd: (evt) => {
        console.log("[genchi] sortable onEnd", {from: evt.oldIndex, to: evt.newIndex});
        const from = evt.oldIndex, to = evt.newIndex;
        if (from === to || from == null || to == null) return;

        setRows((prev) => {
          const optimistic = [...prev];
          const [m] = optimistic.splice(from, 1);
          optimistic.splice(to, 0, m);
          return optimistic;
        });

        const base = [...rowsRef.current];
        const [m] = base.splice(from, 1);
        base.splice(to, 0, m);
        requestAnimationFrame(() => { onReorder && onReorder(base); });
      },
    });

    sortableRef.current = sortable;
    console.log("[genchi] sortable ready (forceFallback:", isTouchDevice, ")");
    return () => { try { sortable.destroy(); } catch(e){} };
  }, [onReorder]);

  // ===== スワイプ（Pointer Events + Touch fallback）=====
  const getCurrentX = (el) => {
    if (!el) return 0;
    const m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(el.style.transform || "");
    if (m) return parseFloat(m[1]);
    const num = parseFloat((el.style.transform || "").replace(/[^0-9-.]/g, ""));
    return isNaN(num) ? 0 : num;
  };
  const beginSwipe = (activeId, startX, startY) => {
    console.log("[genchi] swipe begin", {activeId, startX, startY});
    const el = rowRefs.current[activeId];
    const initialX = el ? getCurrentX(el) : 0;
    if (el) el.style.transition = "none";
    swipeRef.current = { activeId, startX, startY, initialX, locked: false, mode: null };
    try { sortableRef.current?.option("disabled", true); } catch {}
  };
  const updateSwipeX = (dx) => {
    const s = swipeRef.current; if (!s) return;
    const el = rowRefs.current[s.activeId]; if (!el) return;
    let x = s.initialX + dx;
    if (x > 0) x = Math.min(0, x / 4);
    if (x < -DELETE_WIDTH) x = -DELETE_WIDTH + (x + DELETE_WIDTH) / 4;
    el.style.transform = `translateX(${x}px)`;
  };
  const endSwipe = () => {
    const s = swipeRef.current; if (!s) return;
    console.log("[genchi] swipe end");
    const el = rowRefs.current[s.activeId];
    if (el) {
      const currentX = getCurrentX(el);
      const moved = currentX - s.initialX;
      let finalX = 0;
      if (moved <= -10 || currentX < -THRESHOLD) finalX = -DELETE_WIDTH;
      else if (moved >= 10) finalX = 0;
      else finalX = currentX < -THRESHOLD ? -DELETE_WIDTH : 0;
      el.style.transition = "transform .25s ease-out";
      el.style.transform = `translateX(${finalX}px)`;
      setTimeout(() => { if (el) el.style.transition = "none"; }, 260);
    }
    try { sortableRef.current?.option("disabled", false); } catch {}
    swipeRef.current = null;
  };

  // Pointer Events
  const onPointerDown = (e, rowId) => {
    if (e.target.closest(`.${styles.swl__handle}`)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    console.log("[genchi] PE down");
    beginSwipe(rowId, e.clientX, e.clientY);
  };
  const onPointerMove = (e) => {
    const s = swipeRef.current; if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.locked) {
      const moved = Math.abs(dx) > 8 || Math.abs(dy) > 8;
      if (!moved) return;
      s.locked = true;
      s.mode = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      console.log("[genchi] PE lock", s.mode);
    }
    if (s.mode !== "horizontal") return;
    updateSwipeX(dx);
  };
  const onPointerUpOrCancel = (e) => {
    const s = swipeRef.current;
    if (!s) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    endSwipe();
  };

  // Touch fallback（Pointer未対応ブラウザ向け）
  const onTouchStart = (e, rowId) => {
    if (e.target.closest(`.${styles.swl__handle}`)) return;
    const t = e.touches[0]; if (!t) return;
    console.log("[genchi] touch start");
    beginSwipe(rowId, t.clientX, t.clientY);
  };
  const onTouchMove = (e) => {
    const s = swipeRef.current; if (!s) return;
    const t = e.touches[0]; if (!t) return;
    const dx = t.clientX - s.startX;
    const dy = t.clientY - s.startY;
    if (!s.locked) {
      const moved = Math.abs(dx) > 8 || Math.abs(dy) > 8;
      if (!moved) return;
      s.locked = true;
      s.mode = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
      console.log("[genchi] touch lock", s.mode);
    }
    if (s.mode !== "horizontal") return;
    updateSwipeX(dx);
  };
  const onTouchEnd = () => { endSwipe(); };

  // ===== 削除アニメ =====
  function deleteRowSmooth(rowId, idx) {
    setLeavingIds((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
    setTimeout(() => {
      setRows((prev) => prev.filter((_, i) => i !== idx));
      onDelete && onDelete(idx);
      setLeavingIds((prev) => prev.filter((id) => id !== rowId));
    }, 300);
  }

  const openPopup = (row) => { setActiveRow(row); setOpen(true); };
  const closePopup = () => setOpen(false);

  return (
    <>
      <ul className={styles.swl} ref={listRef}>
        {rows.map((row, idx) => {
          const rowId = row.id ?? idx;
          return (
            <li className={`${styles.swl__row} ${leavingIds.includes(rowId) ? styles.isLeaving : ""}`} key={rowId}>
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
                onPointerDown={(e) => window.PointerEvent && onPointerDown(e, rowId)}
                onPointerMove={(e) => window.PointerEvent && onPointerMove(e)}
                onPointerUp={(e) => window.PointerEvent && onPointerUpOrCancel(e)}
                onPointerCancel={(e) => window.PointerEvent && onPointerUpOrCancel(e)}
                onTouchStart={(e) => !window.PointerEvent && onTouchStart(e, rowId)}
                onTouchMove={(e) => !window.PointerEvent && onTouchMove(e)}
                onTouchEnd={(e) => !window.PointerEvent && onTouchEnd(e)}
              >
                <div className={styles.swl__grid}>
                  <button className={styles.swl__handle} type="button" title="ドラッグで並べ替え">
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
