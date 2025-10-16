// src/lib/history.js
// ペア履歴を localStorage に保存するだけの軽いモジュール

const KEY = "pairHistory";

export function loadHistory() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

/** 1件追加（先頭に積む）。戻り値 = 付与された id を含むエントリ */
export function addHistory(entry) {
  const items = loadHistory();
  const withId = { id: Date.now(), ...entry };
  items.unshift(withId);
  saveHistory(items);
  return withId;
}

/** index指定で削除（戻り値 = 最新配列） */
export function deleteHistoryByIndex(index) {
  const items = loadHistory();
  items.splice(index, 1);
  saveHistory(items);
  return loadHistory();
}

/** 並べ替え結果を丸ごと保存 */
export function reorderHistory(nextArray) {
  saveHistory(nextArray);
}
