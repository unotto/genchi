// src/components/TutorialModal.jsx
import React, { useState } from "react";

export default function TutorialModal({ open, onClose }) {
  const pages = [
    {
      title: "1. 通貨を選ぶ → 入力する",
      body: (
        <>
          ホームで<strong>通貨ペア</strong>を選んで金額を入れると、
          すぐに<strong>日本円の換算結果</strong>と
          <small style={{ color: "#6B7280" }}>（1単位のレート）</small>が表示されます。
          <div style={hintBox}>例）<b>100 USD → 15,279 円</b><br />
          <small style={{ color: "#6B7280" }}>1 USD = 152.79 円</small></div>
        </>
      ),
    },
    {
      title: "2. ★通貨ペアを登録",
      body: (
        <>
          気になる換算は「<strong>★通貨ペアを登録</strong>」で保存。
          <br />
          保存した内容は<strong>ペア履歴</strong>で後からスワイプ削除・並べ替えできます。
          <div style={hintBox}>長押しで並べ替え / 横スワイプで削除</div>
        </>
      ),
    },
    {
      title: "3. レート推移をチェック",
      body: (
        <>
          「レート推移」で7日・30日・半年のグラフを表示。
          <br />
          旅行前の相場感づくりにどうぞ ✈️🍫
          <div style={hintBox}>チャートをタップすると拡大表示できます。</div>
        </>
      ),
    },
  ];

  const [idx, setIdx] = useState(0);
  if (!open) return null;

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="使い方チュートリアル">
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <button aria-label="閉じる" style={closeBtn} onClick={onClose}>
          ×
        </button>

        <div style={{ padding: "4px 4px 0", color: "#0077B6", fontWeight: 700, fontSize: 12 }}>
          はじめての方へ
        </div>
        <h3 style={title}>{pages[idx].title}</h3>
        <div style={body}>{pages[idx].body}</div>

        <div style={dotsWrap}>
          {pages.map((_, i) => (
            <span key={i} style={{ ...dot, ...(i === idx ? dotActive : {}) }} />
          ))}
        </div>

        <div style={actions}>
          <button
            type="button"
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
            disabled={idx === 0}
            style={{ ...btn, ...(idx === 0 ? btnDisabled : btnGhost) }}
          >
            戻る
          </button>
          {idx < pages.length - 1 ? (
            <button
              type="button"
              onClick={() => setIdx((v) => Math.min(pages.length - 1, v + 1))}
              style={btnPrimary}
            >
              次へ
            </button>
          ) : (
            <button type="button" onClick={onClose} style={btnPrimary}>
              はじめる
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== styles (インラインで完結) =====
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.45)",
  display: "grid",
  placeItems: "end",
  padding: "18px 14px 26px",
  zIndex: 2001,
};
const sheet = {
  width: "100%",
  maxWidth: 520,
  margin: "0 auto",
  background: "#fff",
  borderRadius: 18,
  boxShadow: "0 10px 30px rgba(0,0,0,.18)",
  padding: 16,
  position: "relative",
};
const closeBtn = {
  position: "absolute",
  right: 8,
  top: 8,
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "none",
  background: "transparent",
  fontSize: 20,
  cursor: "pointer",
  color: "#6B7280",
};
const title = {
  margin: "2px 0 8px",
  fontSize: 18,
  fontWeight: 700,
  color: "#333",
};
const body = {
  fontSize: 14,
  color: "#333",
  lineHeight: 1.6,
};
const hintBox = {
  marginTop: 10,
  padding: "10px 12px",
  background: "#F3F4F6",
  borderRadius: 12,
  fontSize: 13,
};
const dotsWrap = {
  display: "flex",
  gap: 6,
  justifyContent: "center",
  alignItems: "center",
  marginTop: 12,
};
const dot = {
  width: 8,
  height: 8,
  borderRadius: 999,
  background: "#DAE3EA",
};
const dotActive = { background: "#0077B6", width: 20 };
const actions = {
  display: "flex",
  gap: 10,
  marginTop: 12,
};
const btn = {
  flex: 1,
  borderRadius: 999,
  padding: "12px 14px",
  fontSize: 14,
  cursor: "pointer",
  border: "1px solid #E5E7EB",
  background: "#fff",
};
const btnGhost = { background: "#fff" };
const btnDisabled = { opacity: 0.5, cursor: "not-allowed" };
const btnPrimary = {
  flex: 1,
  border: "none",
  borderRadius: 999,
  padding: "12px 14px",
  fontSize: 14,
  background: "#0077B6",
  color: "#fff",
  boxShadow: "0 2px 0 rgba(0,0,0,.08)",
  cursor: "pointer",
};
