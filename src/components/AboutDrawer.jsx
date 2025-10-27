// src/components/AboutDrawer.jsx
import React, { useState, useRef } from "react";
import styles from "./AboutDrawer.module.css";

export default function AboutDrawer({ open, onClose }) {
  // 画面内の静かなステータス表示（alert をやめて二重ダイアログ回避）
  const [status, setStatus] = useState("");
  // 復元フォールバック用の隠し <input type="file">
  const fileInputRef = useRef(null);

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

  // ===== 保存（ダイアログ1回だけ）
  // 優先：showSaveFilePicker → navigator.share（iPhone向け）→ a.download
  const saveBackup = async () => {
    setStatus("");
    const blob = makeBackupBlob();
    const fileName = `genchi-history-${new Date().toISOString().slice(0, 10)}.json`;

    // ① File System Access API（Chrome/Edge/Android など。iOS Safari は未対応）
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setStatus("保存しました。");
        return;
      } catch (e) {
        if (e?.name === "AbortError") return; // ユーザーキャンセル
        // 続行してフォールバック
      }
    }

    // ② 共有シート（iOS 16.4+ 等）。ユーザーが「このiPhone内」を選べば iCloud を使わず保存可能
    try {
      const file = new File([blob], fileName, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Genchi バックアップ",
          text: "保存先を選んでください。（「このiPhone内」を選べばiCloud不要）",
          files: [file],
        });
        setStatus("共有シートから保存できます。");
        return;
      }
    } catch {
      // 続行してフォールバック
    }

    // ③ 最終：通常ダウンロード（iOS は表示が静か／Android・PCは自然）
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus("ダウンロードしました。保存先（ファイル/ダウンロード）をご確認ください。");
  };

  // ===== 復元（ダイアログ1回だけ）
  // 優先：showOpenFilePicker → 隠し input
  const restoreBackup = async () => {
    setStatus("");
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          multiple: false,
          types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
        });
        const file = await handle.getFile();
        await importHistory(file);
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    // フォールバック：通常のファイル選択
    fileInputRef.current?.click();
  };

  const importHistory = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target.result);

          // 修正ポイント：items配列をしっかり抽出
          const items =
            Array.isArray(raw) ? raw :
            (raw.items && Array.isArray(raw.items) ? raw.items : []);

          if (!items.length) throw new Error("no items");

          localStorage.setItem("genchi.history", JSON.stringify(items));
          setStatus("復元しました。ページを再読み込みします…");

          // reloadを少し遅らせて確実に保存させる
          setTimeout(() => window.location.reload(), 1000);

        } catch (err) {
          console.error(err);
          setStatus("復元に失敗しました。バックアップファイルを確認してください。");
        }
        resolve();
      };
      reader.readAsText(file);
    });
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

        {/* ▼ バックアップ（保存／復元のみ） */}
        <div className={styles.backupSection}>
          <h4>バックアップ</h4>

          <div className={styles.btnRow}>
            <button type="button" onClick={saveBackup}>💾 保存</button>
            <button type="button" onClick={restoreBackup}>📥 復元</button>
            {/* フォールバック用の隠し input（iOS Safari などに備える） */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => e.target.files[0] && importHistory(e.target.files[0])}
              style={{ display: "none" }}
            />
          </div>

          {/* 画面内ステータス（alertを使わない） */}
          {status && <p className={styles.statusText}>{status}</p>}

          <p className={styles.helpText}>
            保存：お使いの端末の「ファイル」や「ダウンロード」へ保存できます。
            iPhoneは共有シートから「このiPhone内」を選ぶとiCloudを使いません。<br />
            復元：保存した .json を選ぶだけで元に戻せます。
          </p>
        </div>
        {/* ▲ バックアップ */}
      </aside>
    </>
  );
}
