// src/lib/rates.js
// 為替レート取得を多段フォールバック化：
// 1) exchangerate.host( /convert ) → 2) frankfurter.app → 3) open.er-api.com
// ※ すべて無料・APIキー不要。CORSも許可されています。
// ※ CNH は CNY 扱いにエイリアス。

const X_HOST_CONVERT = "https://api.exchangerate.host/convert";
const FRANKFURTER = "https://api.frankfurter.app/latest";
const OPEN_ERAPI = "https://open.er-api.com/v6/latest";

// CNH は実質 CNY として扱う（exchangerate.hostや他API都合）
const CNH_ALIAS = { CNH: "CNY" };

/** "USD-JPY" などの文字列を {base, quote} に分解 */
export function parsePair(v) {
  if (!v) return { base: "", quote: "" };
  const s = v.toUpperCase().replace(/\s+/g, "");
  if (s.includes("-")) {
    const [b, q] = s.split("-");
    return { base: b, quote: q };
  }
  return { base: "", quote: "" };
}

/** 通貨コード → 記号（なければ通貨コード） */
export function symbolOf(code) {
  const m = {
    USD: "$",
    JPY: "¥",
    EUR: "€",
    GBP: "£",
    AUD: "A$",
    CAD: "C$",
    NZD: "NZ$",
    CHF: "Fr",
    KRW: "₩",
    CNH: "¥", // CNY扱い
    CNY: "¥",
    HKD: "HK$",
    TWD: "NT$",
    THB: "฿",
    SGD: "S$",
    PHP: "₱",
    MYR: "RM",
    IDR: "Rp",
    VND: "₫",
    INR: "₹",
    AED: "AED",
    SEK: "kr",
    DKK: "kr",
    NOK: "kr",
    TRY: "₺",
    MXN: "Mex$",
    ZAR: "R",
  };
  return m[code?.toUpperCase()] || code?.toUpperCase() || "";
}

/** 通貨コード → 日本語名（ペアのラベル用） */
export function jpName(code) {
  const m = {
    USD: "アメリカ",
    JPY: "日本",
    EUR: "ユーロ圏",
    GBP: "イギリス",
    AUD: "オーストラリア",
    CAD: "カナダ",
    NZD: "ニュージーランド",
    CHF: "スイス",
    KRW: "韓国",
    CNH: "中国",
    CNY: "中国",
    HKD: "香港",
    TWD: "台湾",
    THB: "タイ",
    SGD: "シンガポール",
    PHP: "フィリピン",
    MYR: "マレーシア",
    IDR: "インドネシア",
    VND: "ベトナム",
    INR: "インド",
    AED: "アラブ首長国連邦",
    SEK: "スウェーデン",
    DKK: "デンマーク",
    NOK: "ノルウェー",
    TRY: "トルコ",
    MXN: "メキシコ",
    ZAR: "南アフリカ",
  };
  return m[code?.toUpperCase()] || code?.toUpperCase() || "";
}

/** 1 base = ? quote を返す（Number）。多段フォールバック実装 */
export async function getRate(base, quote) {
  base = (CNH_ALIAS[base] || base).toUpperCase();
  quote = (CNH_ALIAS[quote] || quote).toUpperCase();

  // 1) exchangerate.host /convert
  try {
    // e.g. https://api.exchangerate.host/convert?from=USD&to=JPY
    const url = `${X_HOST_CONVERT}?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`exchangerate.host HTTP ${res.status}`);
    const data = await res.json();
    // data.info.rate にレート、data.result に換算値（amount未指定なので resultはrateと同義）
    const rate = data?.info?.rate ?? data?.result;
    if (typeof rate === "number" && isFinite(rate)) {
      return rate;
    }
    throw new Error("exchangerate.host invalid payload");
  } catch (e) {
    console.warn("[rates] exchangerate.host failed:", e?.message || e);
  }

  // 2) frankfurter.app
  try {
    // e.g. https://api.frankfurter.app/latest?from=USD&to=JPY
    const url = `${FRANKFURTER}?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`frankfurter HTTP ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.[quote];
    if (typeof rate === "number" && isFinite(rate)) {
      return rate;
    }
    throw new Error("frankfurter invalid payload");
  } catch (e) {
    console.warn("[rates] frankfurter failed:", e?.message || e);
  }

  // 3) open.er-api.com
  try {
    // e.g. https://open.er-api.com/v6/latest/USD
    const url = `${OPEN_ERAPI}/${encodeURIComponent(base)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`open.er-api HTTP ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.[quote];
    if (typeof rate === "number" && isFinite(rate)) {
      return rate;
    }
    throw new Error("open.er-api invalid payload");
  } catch (e) {
    console.warn("[rates] open.er-api failed:", e?.message || e);
  }

  // すべて失敗
  throw new Error("All rate providers failed");
}
