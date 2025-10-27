// src/components/AboutDrawer.jsx
import React from "react";
import styles from "./AboutDrawer.module.css";

export default function AboutDrawer({ open, onClose }) {
  // ===== 共通：バックアップデータ作成 =====
  const makeBackupBlob = () => {
    const items = JSON.parse(localStorage.getItem("genchi.history") || "[]");
    const payload = {
      type: "genchi.history",
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
    };
    return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  };

  // ===== 保存（iPhoneは共有シート優先→非対応なら通常DL） =====
  const saveBackup = async () => {
    const blob = makeBackupBlob();
    const fileName = `genchi-history-${new Date().toISOString().slice(0,10)}.json`;

    // iPhone/Safari 16.4+ はファイル付き Web Share API に対応
    try {
      const file = new File([blob], fileName, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Genchi バックアップ",
          text: "保存先を選んでください（「このiPhone内」にするとiCloudを使いません）",
          files: [file],
        });
        alert("共有シートを開きました。「このiPhone内」など任意の場所に保存できます。");
        return;
      }
    } catch (_) {
      // 共有キャンセル等はDLにフォールバック
    }

    // フォールバック：通常ダウンロード（Android/PC向けにも自然）
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
    alert("バックアップを保存しました。保存先（ダウンロード / ファイル等）をご確認ください。");
  };

  // ===== 復元（.json読み込み / 旧形式も許容） =====
  const importHistory = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const items = Array.isArray(data) ? data : (data?.items || null);
        if (!Array.isArray(items)) throw new Error("invalid");
        localStorage.setItem("genchi.history", JSON.stringify(items));
        alert("バックアップから履歴を復元しました。");
        window.location.reload();
      } catch {
        alert("ファイル形式が違います。エクスポートした .json を選んでください。");
      }
    };
    reader.readAsText(file);
  };

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

        <h2 id="about-title" className="aboutTitle">このアプリについて</h2>

        <p className="aboutLead">
          海外で「これ、日本円でいくら？」に即答するための、旅向けかんたん為替アプリです。
        </p>

        <ul className="aboutList">
          <li><b>その場で換算：</b>指定した金額を最新レートで即計算。1単位のレートも同時表示。</li>
          <li><b>過去推移をチェック：</b>7日・30日・半年など、ざっくりトレンドを確認。</li>
          <li><b>旅の“体感物価”を見える化：</b>「今日は高い？安い？」の感覚がつかめます。</li>
        </ul>

        <div className="aboutCallout">
          固い経済アプリじゃなくて、旅の勘を取り戻すためのレーダー。気楽にどうぞ。
        </div>

        <div className="aboutMeta">
          <p>データ提供：為替（exchangerate.host）／暗号（CoinGecko）</p>
          <p>※参考用です。実際の取引や両替は自己判断で！</p>
        </div>

        {/* ▼ バックアップ（保存／復元だけ） */}
        <div className={styles.backupSection}>
          <h4>バックアップ</h4>

          <div className={styles.btnRow}>
            <button type="button" onClick={saveBackup}>💾 保存</button>
            <label className={styles.restoreLabel}>
              📥 復元
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => e.target.files[0] && importHistory(e.target.files[0])}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <p className={styles.helpText}>
            保存：お使いの端末の「ファイル」や「ダウンロード」等に保存できます。
            iPhoneは共有シートから「このiPhone内」を選ぶとiCloudを使いません。<br />
            復元：保存したバックアップ（.json）を選ぶだけで元に戻せます。
          </p>
        </div>
      </aside>
    </>
  );
}
