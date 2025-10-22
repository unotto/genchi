import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const listRef = useRef(null);
  const liRefs = useRef({});   // <li>
  const rowRefs = useRef({});  // .swl__swipeableContent
  const [leavingIds, setLeavingIds] = useState([]);
  const [draggingId, setDraggingId] = useState(null);

  // ===== 横スワイプ =====
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
    // スワイプ中は scale を入れない（横位置優先）
    el.style.transform = `translate3d(${x}px,0,0)`;
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
      el.style.transform = `translate3d(${finalX}px,0,0)`;
      setTimeout(() => { if (el) el.style.transition = "none"; }, 260);
    }
    swipeRef.current = null;
  };

  // ===== ドラッグ（上下入れ替え・純JS＋FLIP） =====
  const dragRef = useRef(null); // { id, startY, lastY, index }
  const indexById = (id) =>
    rowsRef.current.findIndex((r, i) => (r.id ?? i) === id);

  // iOS でも確実に「掴んでる感」を出す（右基準 90% 縮小 / 70% 透明 / 右寄せ＋overflow解除）
  const applyDragLift = (rowId) => {
    const li = liRefs.current[rowId];
    const el = rowRefs.current[rowId];
    if (!el) return;
    const x = getCurrentX(el) || 0;
    // 退避
    el._orig = {
      transition: el.style.transition,
      transform: el.style.transform,
      boxShadow: el.style.boxShadow,
      opacity: el.style.opacity,
      willChange: el.style.willChange,
      transformOrigin: el.style.transformOrigin,
    };
    if (li) {
      li._origOverflow = li.style.overflow;
      li.style.overflow = "visible"; // 文字が切れないように
    }
    el.style.willChange = "transform, opacity";
    el.style.transition = "transform .08s ease, box-shadow .08s ease, opacity .08s ease";
    el.style.transformOrigin = "right center"; // 右基準
    el.style.transform = `translate3d(${x}px,0,0) scale(0.9)`; // 90%
    el.style.boxShadow = "0 10px 24px rgba(0,0,0,.18)";
    el.style.opacity = "0.7"; // 70%
    // Safari 安定
    el.offsetHeight; // eslint-disable-line no-unused-expressions
  };

  const clearDragLift = (rowId) => {
    const li = liRefs.current[rowId];
    const el = rowRefs.current[rowId];
    if (!el) return;
    const x = getCurrentX(el) || 0;
    el.style.transition = "transform .1s ease, box-shadow .1s ease, opacity .1s ease";
    el.style.transform = `translate3d(${x}px,0,0) scale(1)`;
    el.style.boxShadow = "none";
    el.style.opacity = "1";
    const done = () => {
      if (el._orig) {
        el.style.transition = el._orig.transition || "";
        el.style.transform = `translate3d(${x}px,0,0)`; // 横位置だけ維持
        el.style.boxShadow = el._orig.boxShadow || "";
        el.style.opacity = el._orig.opacity || "";
        el.style.willChange = el._orig.willChange || "";
        el.style.transformOrigin = el._orig.transformOrigin || "";
        el._orig = null;
      }
      if (li && "_origOverflow" in li) {
        li.style.overflow = li._origOverflow || "";
        delete li._origOverflow;
      }
      el.removeEventListener("transitionend", done);
    };
    el.addEventListener("transitionend", done);
  };

  // FLIP 前計測
  const prevTopsRef = useRef(new Map());
  useLayoutEffect(() => {
    const map = new Map();
    rowsRef.current.forEach((r, i) => {
      const id = r.id ?? i;
      const el = liRefs.current[id];
      if (el) map.set(id, el.getBoundingClientRect().top);
    });
    prevTopsRef.current = map;
  }, []); // 初回のみ

  const measureAndAnimate = () => {
    const prev = prevTopsRef.current;
    if (!prev) return;
    const map = new Map();
    rowsRef.current.forEach((r, i) => {
      const id = r.id ?? i;
      const el = liRefs.current[id];
      if (!el) return;
      const to = el.getBoundingClientRect().top;
      map.set(id, to);
      const from = prev.get(id);
      if (from != null) {
        const dy = from - to;
        if (Math.abs(dy) > 0.5) {
          el.style.transition = "none";
          el.style.transform = `translateY(${dy}px)`;
          el.offsetHeight; // reflow
          el.style.transition = "transform .16s ease";
          el.style.transform = "translateY(0)";
          const clear = () => {
            el.style.transition = "";
            el.removeEventListener("transitionend", clear);
          };
          el.addEventListener("transitionend", clear);
        }
      }
    });
    prevTopsRef.current = map;
  };

  const swapByIndex = (from, to) => {
    if (from === to || from < 0 || to < 0) return;
    // 直前座標
    const before = new Map();
    rowsRef.current.forEach((r, i) => {
      const id = r.id ?? i;
      const el = liRefs.current[id];
      if (el) before.set(id, el.getBoundingClientRect().top);
    });
    prevTopsRef.current = before;

    setRows((prev) => {
      const next = [...prev];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
    requestAnimationFrame(measureAndAnimate);
  };

  const finishDragCommit = () => {
    const id = draggingId;
    setDraggingId(null);
    if (id != null) clearDragLift(id); // 念のため
    onReorder && onReorder(rowsRef.current);
  };

  const handleHandlePointerDown = (e, rowId) => {
    e.preventDefault?.();
    setDraggingId(rowId);
    applyDragLift(rowId); // 見た目を先に確定

    const p = "clientY" in e ? e : (e.touches && e.touches[0]);
    const startY = p?.clientY ?? 0;
    dragRef.current = { id: rowId, startY, lastY: startY, index: indexById(rowId) };

    const move = (ev) => {
      const q = "clientY" in ev ? ev : (ev.touches && ev.touches[0]);
      const y = q?.clientY ?? dragRef.current.lastY;

      const under = document.elementFromPoint(
        (ev.clientX ?? (q?.clientX ?? 1)),
        y
      );
      const li = under ? under.closest("li") : null;
      if (!li) { dragRef.current.lastY = y; return; }

      const targetIdAttr = li.getAttribute("data-id");
      let targetId = null;
      if (targetIdAttr != null) {
        targetId = /^\d+$/.test(targetIdAttr) ? parseInt(targetIdAttr, 10) : targetIdAttr;
      }
      const to = targetId != null ? indexById(targetId) : -1;
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
      clearDragLift(rowId);
      finishDragCommit();
    };

    if (window.PointerEvent) {
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    } else {
      document.addEventListener("touchmove", move, { passive: true });
      document.addEventListener("touchend", up, { passive: true });
    }
  };

  // 本文側の横スワイプ
  const onPointerDown = (e, rowId) => {
    if (e.target.closest(`.${styles.swl__handle}`)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
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
    }
    if (s.mode !== "horizontal") return;
    updateSwipeX(dx);
  };
  const onPointerUpOrCancel = (e) => {
    if (!swipeRef.current) return;
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

  // ===== 削除 =====
  function deleteRowSmooth(rowId, idx) {
    setLeavingIds((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
    setTimeout(() => {
      setRows((prev) => prev.filter((_, i) => i !== idx));
      onDelete && onDelete(idx);
      setLeavingIds((prev) => prev.filter((id) => id !== rowId));
    }, 300);
  }

  // ===== モーダル =====
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
          const dragging = draggingId === rowId;
          return (
            <li
              ref={(el) => (liRefs.current[rowId] = el)}
              className={`${styles.swl__row} ${leavingIds.includes(rowId) ? styles.isLeaving : ""} ${dragging ? styles.isDragging : ""}`}
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
                className={`${styles.swl__swipeableContent} ${dragging ? styles.isDraggingContent : ""}`}
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
                  <div
                    className={styles.swl__handle}
                    role="button"
                    aria-label="ドラッグで並べ替え"
                    tabIndex={0}
                    onPointerDown={(e) => { if (window.PointerEvent) handleHandlePointerDown(e, rowId); }}
                    onTouchStart={(e) => { if (!window.PointerEvent) handleHandlePointerDown(e, rowId); }}
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
