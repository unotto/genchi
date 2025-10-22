import React, { useEffect, useRef, useState } from "react";
import styles from "./SwipeActionsList.module.css";

import dots from "../img/dot.webp";
import trashHint from "../img/rubbish-h-icon.webp";
import trashSolid from "../img/rubbish-icon.webp";
import batu from "../img/batu.webp";

const DELETE_WIDTH = 80;
const THRESHOLD = DELETE_WIDTH * 0.4;

export default function SwipeActionsList({ items = [], onDelete, onReorder }) {
  const [rows, setRows] = useState(items);
  useEffect(() => setRows(items), [items]);

  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const rowRefs = useRef({});
  const [draggingId, setDraggingId] = useState(null);
  const [leavingIds, setLeavingIds] = useState([]);

  // ===============================
  // 横スワイプ処理
  // ===============================
  const swipeRef = useRef(null);

  const getCurrentX = (el) => {
    if (!el) return 0;
    const m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(el.style.transform || "");
    if (m) return parseFloat(m[1]);
    const num = parseFloat((el.style.transform || "").replace(/[^0-9-.]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const beginSwipe = (id, startX, startY) => {
    const el = rowRefs.current[id];
    const initialX = el ? getCurrentX(el) : 0;
    if (el) el.style.transition = "none";
    swipeRef.current = { id, startX, startY, initialX, locked: false, mode: null };

    const move = (e) => {
      const x = e.clientX ?? (e.touches && e.touches[0]?.clientX);
      const y = e.clientY ?? (e.touches && e.touches[0]?.clientY);
      if (x == null || y == null) return;
      const s = swipeRef.current;
      const dx = x - s.startX;
      const dy = y - s.startY;
      if (!s.locked) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          s.locked = true;
          s.mode = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        }
      }
      if (s.mode === "horizontal") {
        e.preventDefault?.();
        updateSwipeX(dx);
      }
    };

    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
      endSwipe();
    };

    document.addEventListener("pointermove", move, { passive: false });
    document.addEventListener("pointerup", up);
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", up);
  };

  const updateSwipeX = (dx) => {
    const s = swipeRef.current;
    if (!s) return;
    const el = rowRefs.current[s.id];
    if (!el) return;
    let x = s.initialX + dx;
    if (x > 0) x = Math.min(0, x / 4);
    if (x < -DELETE_WIDTH) x = -DELETE_WIDTH + (x + DELETE_WIDTH) / 4;
    el.style.transform = `translateX(${x}px)`;
  };

  const endSwipe = () => {
    const s = swipeRef.current;
    if (!s) return;
    const el = rowRefs.current[s.id];
    if (el) {
      const currentX = getCurrentX(el);
      const moved = currentX - s.initialX;
      let finalX = 0;
      if (moved <= -10 || currentX < -THRESHOLD) finalX = -DELETE_WIDTH;
      else if (moved >= 10) finalX = 0;
      else finalX = currentX < -THRESHOLD ? -DELETE_WIDTH : 0;
      el.style.transition = "transform .25s ease-out";
      el.style.transform = `translateX(${finalX}px)`;
      setTimeout(() => {
        if (el) el.style.transition = "none";
      }, 250);
    }
    swipeRef.current = null;
  };

  // ===============================
  // ドラッグ処理（上下入れ替え）
  // ===============================
  const dragRef = useRef(null);
  const indexById = (id) => rowsRef.current.findIndex((r, i) => (r.id ?? i) === id);

  const swapByIndex = (from, to) => {
    if (from === to || from < 0 || to < 0) return;
    setRows((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  };

  const finishDragCommit = () => {
    setDraggingId(null);
    onReorder && onReorder(rowsRef.current);
  };

  const handleHandlePointerDown = (e, rowId) => {
    e.stopPropagation();
    e.preventDefault?.();
    setDraggingId(rowId);

    const p = "clientY" in e ? e : e.touches?.[0];
    const startY = p?.clientY ?? 0;
    dragRef.current = { id: rowId, startY, lastY: startY, index: indexById(rowId) };

    const move = (ev) => {
      const q = "clientY" in ev ? ev : ev.touches?.[0];
      const y = q?.clientY ?? dragRef.current.lastY;
      const under = document.elementFromPoint(ev.clientX ?? q?.clientX ?? 1, y);
      const li = under ? under.closest("li") : null;
      if (!li) return;
      const toIdAttr = li.getAttribute("data-id");
      const toId = /^\d+$/.test(toIdAttr) ? parseInt(toIdAttr, 10) : toIdAttr;
      const to = indexById(toId);
      if (to >= 0 && to !== dragRef.current.index) {
        swapByIndex(dragRef.current.index, to);
        dragRef.current.index = to;
      }
      dragRef.current.lastY = y;
    };

    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
      dragRef.current = null;
      finishDragCommit();
    };

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerup", up);
    document.addEventListener("touchmove", move, { passive: true });
    document.addEventListener("touchend", up);
  };

  // ===============================
  // 削除処理
  // ===============================
  const deleteRowSmooth = (rowId, idx) => {
    setLeavingIds((prev) => [...prev, rowId]);
    setTimeout(() => {
      setRows((prev) => prev.filter((_, i) => i !== idx));
      onDelete && onDelete(idx);
      setLeavingIds((prev) => prev.filter((id) => id !== rowId));
    }, 300);
  };

  // ===============================
  // モーダル
  // ===============================
  const [open, setOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);
  const openPopup = (row) => {
    setActiveRow(row);
    setOpen(true);
  };
  const closePopup = () => setOpen(false);

  return (
    <>
      <ul className={styles.swl}>
        {rows.map((row, idx) => {
          const rowId = row.id ?? idx;
          const dragging = draggingId === rowId;
          return (
            <li
              key={rowId}
              data-id={rowId}
              className={`${styles.swl__row} ${leavingIds.includes(rowId) ? styles.isLeaving : ""} ${dragging ? styles.isDragging : ""}`}
            >
              {/* 削除ボタン */}
              <button
                className={styles.swl__deleteAction}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRowSmooth(rowId, idx);
                }}
              >
                <img src={trashSolid} alt="削除" />
              </button>

              {/* スワイプ部分（白い本体） */}
              <div
                className={styles.swl__swipeableContent}
                ref={(el) => (rowRefs.current[rowId] = el)}
                onPointerDown={(e) => beginSwipe(rowId, e.clientX, e.clientY)}
                onTouchStart={(e) => beginSwipe(rowId, e.touches[0].clientX, e.touches[0].clientY)}
              >
                <div className={styles.swl__grid}>
                  {/* ハンドル（上下ドラッグ専用） */}
                  <div
                    className={styles.swl__handle}
                    role="button"
                    aria-label="ドラッグで並べ替え"
                    onPointerDown={(e) => handleHandlePointerDown(e, rowId)}
                    onTouchStart={(e) => handleHandlePointerDown(e, rowId)}
                  >
                    <img src={dots} alt="" draggable="false" />
                  </div>

                  {/* 本文 */}
                  <div className={styles.swl__body}>
                    {row.date && <div className={styles.swl__date}>{row.date}</div>}
                    <button
                      type="button"
                      className={styles.swl__bodyBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        openPopup(row);
                      }}
                    >
                      <div className={styles.swl__contentMask}>
                        <div className={styles.swl__line}>
                          <span className={`${styles.swl__money} ${styles.em}`}>{row.left}</span>
                          <span className={styles.swl__arrow}>→</span>
                          <span className={`${styles.swl__money} ${styles.em}`}>
                            {String(row.right).split("\n")[0]}
                          </span>
                        </div>
                        {row.memo && (
                          <p className={styles.swl__memo} title={row.memo}>
                            {row.memo}
                          </p>
                        )}
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
        <div className={styles.modalOverlay} onClick={closePopup}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closePopup}>
              <img src={batu} alt="閉じる" />
            </button>
            <div className={styles.modalScroll}>
              <div className={styles.modalLine}>
                <div className={styles.modalMoney}>{activeRow.left}</div>
                <div className={styles.modalArrow}>↓</div>
                <div className={styles.modalMoney}>
                  {String(activeRow.right).split("\n")[0]}
                  <br />
                  <span className={styles.modalSubUnit}>
                    {String(activeRow.right).split("\n")[1] || ""}
                  </span>
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
