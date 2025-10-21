import React, { useEffect, useRef, useState } from "react";
import styles from "./SwipeActionsList.module.css";

import dots from "../img/dot.webp";
import trashHint from "../img/rubbish-h-icon.webp";
import trashSolid from "../img/rubbish-icon.webp";
import batu from "../img/batu.webp";

const DELETE_WIDTH = 80;
const THRESHOLD = DELETE_WIDTH * 0.4;

const isTouch =
  typeof window !== "undefined" &&
  ("ontouchstart" in window ||
    (navigator && navigator.maxTouchPoints > 0) ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));

export default function SwipeActionsList({ items = [], onDelete, onReorder }) {
  // 表示用
  const [rows, setRows] = useState(items);
  useEffect(() => setRows(items), [items]);

  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const listRef = useRef(null);
  const rowRefs = useRef({});          // 各行の swipeableContent DIV
  const [leavingIds, setLeavingIds] = useState([]);

  // ====== 横スワイプ（削除ボタン） ======
  const swipeRef = useRef(null); // { activeId, startX, startY, initialX, locked, mode }

  const getCurrentX = (el) => {
    if (!el) return 0;
    const m = /translateX\((-?\d+(?:\.\d+)?)px\)/.exec(el.style.transform || "");
    if (m) return parseFloat(m[1]);
    const num = parseFloat((el.style.transform || "").replace(/[^0-9-.]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const beginSwipe = (activeId, startX, startY) => {
    const el = rowRefs.current[activeId];
    const initialX = el ? getCurrentX(el) : 0;
    if (el) el.style.transition = "none";
    swipeRef.current = { activeId, startX, startY, initialX, locked: false, mode: null };
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
    swipeRef.current = null;
  };

  // ====== 上下ドラッグ入れ替え（ハンドル限定・純JS） ======
  const dragRef = useRef(null); // { id, startY, lastY, index }
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
    const finalRows = rowsRef.current;
    onReorder && onReorder(finalRows);
  };

  const handleHandlePointerDown = (e, rowId) => {
    // 既定のテキスト選択などを抑制
    e.preventDefault?.();
    const p = "clientY" in e ? e : (e.touches && e.touches[0]);
    const startY = p?.clientY ?? 0;
    dragRef.current = { id: rowId, startY, lastY: startY, index: indexById(rowId) };

    // ドキュメントにグローバルリスナー（指が画面外に出ても追従）
    const move = (ev) => {
      const q = "clientY" in ev ? ev : (ev.touches && ev.touches[0]);
      const y = q?.clientY ?? dragRef.current.lastY;
      const dy = y - dragRef.current.startY;

      // 現在の要素の位置（画面上のY）を使って、重なった LI を拾う
      const el = listRef.current;
      if (!el) return;
      const under = document.elementFromPoint(
        (ev.clientX ?? (q?.clientX ?? 1)),
        y
      );
      const li = under ? under.closest("li") : null;
      if (!li) { dragRef.current.lastY = y; return; }

      // data-id から目標インデックスを計算
      const targetIdAttr = li.getAttribute("data-id");
      let targetId = null;
      if (targetIdAttr != null) {
        // 数値に見えるものは数値に
        targetId = /^\d+$/.test(targetIdAttr) ? parseInt(targetIdAttr, 10) : targetIdAttr;
      }
      const to = targetId != null ? indexById(targetId) : -1;
      if (to >= 0 && to !== dragRef.current.index) {
        // 入れ替え（視覚効果は「その場で入れ替わる」方式）
        swapByIndex(dragRef.current.index, to);
        dragRef.current.index = to;
      }
      dragRef.current.lastY = y;
    };

    const up = () => {
      document.removeEventListener("pointermove", move, { passive: true });
      document.removeEventListener("pointerup", up);
      document.removeEventListener("touchmove", move, { passive: true });
      document.removeEventListener("touchend", up);
      dragRef.current = null;
      finishDragCommit();
    };

    if (window.PointerEvent) {
      document.addEventListener("pointermove", move, { passive: true });
      document.addEventListener("pointerup", up, { passive: true });
    } else {
      document.addEventListener("touchmove", move, { passive: true });
      document.addEventListener("touchend", up, { passive: true });
    }
  };

  // ====== スワイプ（本文側で横、縦はスクロール） ======
  const onPointerDown = (e, rowId) => {
    if (e.target.closest(`.${styles.swl__handle}`)) return; // ハンドル上は上下ドラッグ専用
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = e;
    beginSwipe(rowId, p.clientX, p.clientY);
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
    }
    if (s.mode !== "horizontal") return; // 縦はスクロールに譲る
    updateSwipeX(dx);
  };
  const onPointerUpOrCancel = (e) => {
    const s = swipeRef.current;
    if (!s) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    endSwipe();
  };

  const onTouchStart = (e, rowId) => {
    if (e.target.closest(`.${styles.swl__handle}`)) return;
    const t = e.touches[0]; if (!t) return;
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
    }
    if (s.mode !== "horizontal") return;
    updateSwipeX(dx);
  };
  const onTouchEnd = () => { endSwipe(); };

  // ====== 削除（アニメ） ======
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
              data-id={rowId}
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
                onPointerDown={(e) => window.PointerEvent && onPointerDown(e, rowId)}
                onPointerMove={(e) => window.PointerEvent && onPointerMove(e)}
                onPointerUp={(e) => window.PointerEvent && onPointerUpOrCancel(e)}
                onPointerCancel={(e) => window.PointerEvent && onPointerUpOrCancel(e)}
                onTouchStart={(e) => !window.PointerEvent && onTouchStart(e, rowId)}
                onTouchMove={(e) => !window.PointerEvent && onTouchMove(e)}
                onTouchEnd={(e) => !window.PointerEvent && onTouchEnd(e)}
              >
                <div className={styles.swl__grid}>
                  {/* ▼ ハンドル：DIV化（既定挙動の影響を排除）、当たり広め */}
                  <div
                    className={styles.swl__handle}
                    role="button"
                    aria-label="ドラッグで並べ替え"
                    tabIndex={0}
                    onPointerDown={(e) => {
                      if (window.PointerEvent) handleHandlePointerDown(e, rowId);
                    }}
                    onTouchStart={(e) => {
                      if (!window.PointerEvent) handleHandlePointerDown(e, rowId);
                    }}
                  >
                    <img src={dots} alt="" aria-hidden="true" draggable="false" />
                  </div>

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
