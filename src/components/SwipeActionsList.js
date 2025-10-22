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

  // ---- 安定ID（indexをkeyにしない） ----
  const uidMapRef = useRef(new WeakMap());
  const uidSeqRef = useRef(0);
  const getRowId = (row, i) => {
    if (row && row.id != null) return row.id;
    const map = uidMapRef.current;
    if (map.has(row)) return map.get(row);
    const uid = `uid_${Date.now()}_${uidSeqRef.current++}`;
    map.set(row, uid);
    return uid;
  };

  const liRefs  = useRef({});
  const rowRefs = useRef({});

  const [leavingIds, setLeavingIds] = useState([]);
  const [draggingId, setDraggingId] = useState(null); // ← ドラッグ中の行ID

  // ===========================
  // 横スワイプ（削除）
  // ===========================
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

  // ===========================
  // 上下ドラッグ（純JS＋FLIP）
  // ===========================
  const dragRef = useRef(null); // { id, index }
  const indexById = (id) => rowsRef.current.findIndex((r, i) => getRowId(r, i) === id);

  // FLIP用に直前の top を保持
  const prevTopsRef = useRef(new Map());
  useLayoutEffect(() => {
    const map = new Map();
    rowsRef.current.forEach((r, i) => {
      const id = getRowId(r, i);
      const el = liRefs.current[id];
      if (el) map.set(id, el.getBoundingClientRect().top);
    });
    prevTopsRef.current = map;
  }, []);

  const measureAndAnimate = () => {
    const prev = prevTopsRef.current;
    if (!prev) return;

    const map = new Map();
    rowsRef.current.forEach((r, i) => {
      const id = getRowId(r, i);
      const el = liRefs.current[id];
      if (!el) return;
      const to = el.getBoundingClientRect().top;
      map.set(id, to);

      // ドラッグ中の行はFLIPを当てない
      if (id === draggingId) return;

      const from = prev.get(id);
      if (from != null) {
        const dy = from - to;
        if (Math.abs(dy) > 0.5) {
          el.style.transition = "none";
          el.style.transform = `translateY(${dy}px)`;
          void el.offsetHeight;
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

    const before = new Map();
    rowsRef.current.forEach((r, i) => {
      const id = getRowId(r, i);
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

  // 並べ替えで再レンダーされても、`isDragging` クラスで見た目を維持
  useLayoutEffect(() => {
    // 何もしなくてOK：見た目は CSS の .isDragging で管理
  }, [rows, draggingId]);

  const finishDragCommit = () => {
    setDraggingId(null); // ← クラスが外れて元の見た目（サイズ＆ハンドル色）に戻る
    onReorder && onReorder(rowsRef.current);
  };

  const handleHandlePointerDown = (e, rowId) => {
    e.preventDefault?.();
    setDraggingId(rowId); // ← li に isDragging クラスを付けるトリガー

    dragRef.current = { id: rowId, index: indexById(rowId) };

    const move = (ev) => {
      // 指下/マウス下の li を見つけて index を取得
      const pointX = "clientX" in ev ? ev.clientX : (ev.touches?.[0]?.clientX ?? 1);
      const pointY = "clientY" in ev ? ev.clientY : (ev.touches?.[0]?.clientY ?? 1);
      const under = document.elementFromPoint(pointX, pointY);
      const li = under ? under.closest("li") : null;
      if (!li) return;

      const targetAttr = li.getAttribute("data-id");
      const toId = targetAttr && (/^\d+$/.test(targetAttr) ? parseInt(targetAttr, 10) : targetAttr);
      const to = toId != null ? indexById(toId) : -1;
      if (to >= 0 && to !== dragRef.current.index) {
        swapByIndex(dragRef.current.index, to);
        dragRef.current.index = to;
      }
    };

    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
      dragRef.current = null;
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

  // 本文の横スワイプ（ハンドルは除外）
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

  // ===========================
  // 削除
  // ===========================
  function deleteRowSmooth(rowId, idx) {
    setLeavingIds((prev) => (prev.includes(rowId) ? prev : [...prev, rowId]));
    setTimeout(() => {
      setRows((prev) => prev.filter((_, i) => i !== idx));
      onDelete && onDelete(idx);
      setLeavingIds((prev) => prev.filter((id) => id !== rowId));
    }, 300);
  }

  // ===========================
  // モーダル
  // ===========================
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
      <ul className={styles.swl}>
        {rows.map((row, idx) => {
          const rowId = getRowId(row, idx);
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
