// src/components/AboutDrawer.jsx
import React from "react";
import styles from "./AboutDrawer.module.css";

// ===== バックアップ処理 =====
const exportHistory = () => {
  const items = JSON.parse(localStorage.getItem("genchi.history") || "[]");
  const payload = {
    type: "genchi.history",
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `genchi-history-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};


const importHistory = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const items = Array.isArray(data) ? data // 旧形式も受け入れ
                  : (data?.type === "genchi.history" ? data.items : null);
      if (!Array.isArray(items)) throw new Error();

      localStorage.setItem("genchi.history", JSON.stringify(items));
      alert("バックアップから履歴を復元しました。");
      window.location.reload();
    } catch {
      alert("ファイル形式が違います。エクスポートしたバックアップを選んでください。");
    }
  };
  reader.readAsText(file);
};

export default function AboutDrawer({ open, onClose }) {
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
        onClick={(e) => e.stopPropagation()} // ← 内側クリックで閉じないように
      >
        <button
          type="button"
          className="aboutClose"
          aria-label="閉じる"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 id="about-title" className="aboutTitle">このアプリについて</h2>

        <p className="aboutLead">
          海外で「これ、日本円でいくら？」に即答するための、旅向けかんたん為替アプリです。
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
          固い経済アプリじゃなくて、旅の勘を取り戻すためのレーダー。気楽にどうぞ。
        </div>

        <div className="aboutMeta">
          <p>データ提供：為替（exchangerate.host）／暗号（CoinGecko）</p>
          <p>※参考用です。実際の取引や両替は自己判断で！</p>
        </div>

        {/* ▼ バックアップ（ドロワー内） */}
        <div className={styles.backupSection}>
          <h4>バックアップ</h4>
          <button type="button" onClick={exportHistory}>📤 データを保存</button>
          <label className={styles.restoreLabel}>
            📥 データを復元
            <input
              type="file"
              accept="application/json"
              onChange={(e) => e.target.files[0] && importHistory(e.target.files[0])}
              style={{ display: "none" }}
            />
          </label>
          <p className={styles.helpText}>
              保存：お使いの端末の「ファイル」に保存されます。<br />
              復元：保存したファイルを選ぶだけでOK。
          </p>
        </div>

      </aside>
    </>
  );
}
