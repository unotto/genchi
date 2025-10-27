// src/components/AboutDrawer.jsx
import React, { useRef, useState } from "react";
import styles from "./AboutDrawer.module.css";

const SAVE_COOLDOWN_MS = 1200; // 連打ガード

export default function AboutDrawer({ open, onClose }) {
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const saveBusyRef = useRef(false);

  // ============== バックアップ作成 ==============
  // ※ 書式は配列 [] をそのまま書き出し（復元側は [] / {items:[]} どちらも受ける）
  const makeBackupBlob = () => {
    const items = JSON.parse(localStorage.getItem("genchi.history") || "[]");
    const text = JSON.stringify(items, null, 2);
    return new Blob([text], { type: "application/json" });
  };

  // ============== 保存（上書き対応ブラウザは上書き、iOSは連番・二重保存は防止） ==============
  const saveBackup = async () => {
    if (saveBusyRef.current) return;
    saveBusyRef.current = true;
    setSaving(true);
    setStatus("");

    const blob = makeBackupBlob();
    const fileName = `genchi-history-${new Date().toISOString().slice(0, 10)}.json`;

    try {
      // ① Chrome/Edge/Android：showSaveFilePicker → 同名ファイルで上書き可
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
            excludeAcceptAllOption: false,
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          setStatus("保存しました。（対応ブラウザでは上書き保存できます）");
          return; // 二重保存なし
        } catch (e) {
          if (e?.name === "AbortError") return; // キャンセル
          // それ以外は下のフォールバックへ
        }
      }

      // ② iOS 16.4+：共有シート（ユーザーが「このiPhone内」を選べば iCloud 不要）
      try {
        const file = new File([blob], fileName, { type: "application/json" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Genchi バックアップ",
            text: "保存先を選んでください（「このiPhone内」を選べばiCloud不要）",
            files: [file],
          });
          setStatus("共有シートから保存できます。");
          return;
        }
      } catch {
        /* 最終手段へ */
      }

      // ③ 最終：通常ダウンロード（iOSは連番になるのが仕様）
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatus("ダウンロードしました。保存先（ファイル/ダウンロード）をご確認ください。");
    } finally {
      setSaving(false);
      setTimeout(() => { saveBusyRef.current = false; }, SAVE_COOLDOWN_MS);
    }
  };

  // ============== 復元（iOSのグレーアウト回避のため input を使用） ==============
  const restoreBackup = () => {
    setStatus("");
    fileInputRef.current?.click();
  };

  // どんなJSONでも items 配列を取り出す：[], {items:[]}, {data:{items:[]}} すべて吸収
  const parseItemsLoose = (raw) => {
    if (typeof raw === "string") {
      const txt = raw.replace(/^\uFEFF/, "").trim(); // BOM除去
      return parseItemsLoose(JSON.parse(txt));
    }
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.items)) return raw.items;
    if (raw && raw.data && Array.isArray(raw.data.items)) return raw.data.items;
    return [];
  };

  // 実インポート：複数キーへ書いて互換性確保 → 少し待って自動リロード
  const importHistory = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const items = parseItemsLoose(text);
        const payload = JSON.stringify(items);

        // あなたの環境で読み取りキーが違っても拾えるように複数に保存
        localStorage.setItem("genchi.history", payload); // 現行
        localStorage.setItem("history", payload);        // 旧
        localStorage.setItem("pairHistory", payload);    // 旧候補

        setStatus(`復元しました（${items.length}件）。ページを更新します…`);
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        console.error(err);
        setStatus("復元に失敗しました。保存した .json を選んでください。");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ""; // 同じファイル再選択OK
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

      {/* ドロワー本体 */}
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

        {/* ======= ここは元の説明テキスト（そのまま残す） ======= */}
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
        {/* ======= ここまで元の説明テキスト ======= */}

        {/* ▼ バックアップ（保存／復元） */}
        <div className={styles.backupSection}>
          <h4>バックアップ</h4>

          <div className={styles.btnRow}>
            <button type="button" onClick={saveBackup} disabled={saving}>
              {saving ? "保存中…" : "💾 保存"}
            </button>

            <button type="button" onClick={restoreBackup}>📥 復元</button>

            {/* iOS対策：グレーアウト回避のため accept を広く */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,text/plain,application/octet-stream,.json,.txt,*/*"
              onChange={(e) => e.target.files[0] && importHistory(e.target.files[0])}
              style={{ display: "none" }}
            />
          </div>

          {status && <p className={styles.statusText}>{status}</p>}
          <p className={styles.helpText}>
            iPhoneで選べない/グレー表示のとき：右上「ブラウズ」→「このiPhone内」に移動してから選択。
            雲アイコンは一度タップして端末にダウンロードしてください。
          </p>
        </div>
      </aside>
    </>
  );
}
