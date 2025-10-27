// src/components/AboutDrawer.jsx
import React from "react";

export default function AboutDrawer({ open, onClose }) {
  if (!open) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className={`aboutOverlay ${open ? "is-open" : ""}`}
        role="presentation"
        onClick={onClose}
      />

      {/* スライドドロワー */}
      <aside
        className={`aboutDrawer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        aria-labelledby="about-title"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="aboutClose"
          aria-label="閉じる"
          onClick={onClose}
        >
          ✕
        </button>

        {/* ===== アプリ概要 ===== */}
        <h2 id="about-title" className="aboutTitle">
          このアプリについて
        </h2>

        <p className="aboutLead">
          海外で「これ、日本円でいくら？」に即答するための、
          旅向けかんたん為替アプリです。
        </p>

        <ul className="aboutList">
          <li>
            <b>その場で換算：</b>
            指定した金額を最新レートで即計算。1単位のレートも同時表示。
          </li>
          <li>
            <b>過去推移をチェック：</b>
            7日・30日・半年など、ざっくりトレンドを確認。
          </li>
          <li>
            <b>旅の“体感物価”を見える化：</b>
            「今日は高い？安い？」の感覚がつかめます。
          </li>
        </ul>

        <div className="aboutCallout">
          固い経済アプリじゃなくて、
          旅の勘を取り戻すためのレーダー。気楽にどうぞ。
        </div>

        <div className="aboutMeta">
          <p>データ提供：為替（exchangerate.host）／暗号（CoinGecko）</p>
          <p>※参考用です。実際の取引や両替は自己判断で！</p>
        </div>
      </aside>
    </>
  );
}
