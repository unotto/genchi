// src/pages/Rate.jsx
import React, { useEffect, useMemo, useState } from "react";
import Current from "../components/Current";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// Home.jsx と同じペア（指定リスト）
const PAIRS = [
  "USD-JPY","EUR-JPY","GBP-JPY","AUD-JPY","CAD-JPY","NZD-JPY","CHF-JPY",
  "KRW-JPY","CNH-JPY","HKD-JPY","TWD-JPY","THB-JPY","SGD-JPY","PHP-JPY",
  "MYR-JPY","IDR-JPY","VND-JPY","INR-JPY","AED-JPY","SEK-JPY","DKK-JPY",
  "NOK-JPY","TRY-JPY","MXN-JPY","ZAR-JPY",
];

// 通貨記号
const symbolOf = (c) => ({
  USD:"$", EUR:"€", GBP:"£", JPY:"¥", KRW:"₩", CNY:"¥", CNH:"¥", HKD:"HK$",
  TWD:"NT$", THB:"฿", SGD:"S$", PHP:"₱", MYR:"RM", IDR:"Rp", VND:"₫",
  INR:"₹", AED:"د.إ", SEK:"kr", DKK:"kr", NOK:"kr", TRY:"₺", MXN:"Mex$",
  ZAR:"R", AUD:"A$", CAD:"C$", NZD:"NZ$"
}[c] || c);

function parsePair(v){
  if (!v) return { base:"", quote:"" };
  const [b,q] = v.toUpperCase().split("-");
  return { base:b, quote:q };
}

// CNH → CNY 変換（exchangerate.host は CNH が弱いため）
function aliasFiat(code){
  if (code === "CNH") return "CNY";
  return code;
}

// 期間（今日を含む連続 n 日）YYYY-MM-DD
function rangeFromDays(days){
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (Number(days) - 1));
  const toStr = (d)=> d.toISOString().slice(0,10);
  return { start: toStr(start), end: toStr(end) };
}

// start..end を昇順で列挙
function enumerateDates(startStr, endStr){
  const out = [];
  const s = new Date(startStr + "T00:00:00Z");
  const e = new Date(endStr + "T00:00:00Z");
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate()+1)) {
    out.push(d.toISOString().slice(0,10));
  }
  return out;
}

// 0.5刻みで 5 本 tick
function makeTicks(minVal, maxVal){
  if (!isFinite(minVal) || !isFinite(maxVal)) return undefined;
  const floor05 = (v)=> Math.floor(v*2)/2;
  const ceil05  = (v)=> Math.ceil(v*2)/2;
  let min = floor05(minVal);
  let max = ceil05(maxVal);
  if (min === max){ min -= 1; max += 1; }
  const step = (max - min) / 4;
  const ticks = [];
  for (let i=0; i<5; i++) ticks.push(Math.round((min + step*i)*2)/2);
  return ticks;
}

/* ------------------- 外部 API 呼び出し群 ------------------- */

// 1) exchangerate.host timeseries
async function fetchTimeseries(base, quote, start, end){
  const url = `https://api.exchangerate.host/timeseries?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}&start_date=${start}&end_date=${end}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("timeseries-network");
  const json = await res.json();
  if (!json || json.success === false || !json.rates) throw new Error("timeseries-no-data");
  const days = Object.keys(json.rates).sort();
  const data = days.map(d => ({ date: d, rate: Number(json.rates[d][quote]) }))
                   .filter(d => isFinite(d.rate));
  if (!data.length) throw new Error("timeseries-empty");
  return data;
}

// 2) exchangerate.host 日別ヒストリカルを連打
async function fetchDailySeries(base, quote, start, end){
  const days = enumerateDates(start, end);
  const results = await Promise.all(days.map(async (d) => {
    const u = `https://api.exchangerate.host/${d}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}`;
    const r = await fetch(u);
    if (!r.ok) return null;
    const j = await r.json();
    const rate = j?.rates?.[quote];
    return (typeof rate === "number") ? { date: d, rate } : null;
  }));
  const arr = results.filter(Boolean);
  if (!arr.length) throw new Error("daily-empty");
  return arr.sort((a,b)=> a.date < b.date ? -1 : 1);
}

// 3) frankfurter.app の時系列
async function fetchFrankfurter(base, quote, start, end){
  // Frankfurter は主要通貨寄り（KRW など一部弱い）。失敗したら投げる。
  const url = `https://api.frankfurter.app/${start}..${end}?from=${encodeURIComponent(base)}&to=${encodeURIComponent(quote)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("frankfurter-network");
  const j = await res.json();
  if (!j || !j.rates) throw new Error("frankfurter-no-data");
  const days = Object.keys(j.rates).sort();
  const data = days.map(d => ({ date: d, rate: Number(j.rates[d][quote]) }))
                   .filter(d => isFinite(d.rate));
  if (!data.length) throw new Error("frankfurter-empty");
  return data;
}

// 4) 今日のレートだけ取る
async function fetchLatest(base, quote){
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(quote)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("latest-network");
  const j = await r.json();
  const rate = j?.rates?.[quote];
  if (typeof rate !== "number") throw new Error("latest-no-rate");
  return rate;
}

// 5) 擬似データ（最新レート around のランダムウォーク）
function synthSeriesFromLatest(latest, start, end){
  const days = enumerateDates(start, end);
  // 変動幅は 0.3% 程度で揺らす
  let v = latest;
  const arr = days.map(d => {
    const noise = (Math.random() - 0.5) * 0.006; // ±0.3%
    v = Math.max(0.0001, v * (1 + noise));
    // 小数 1 桁（0.5 刻みっぽく丸め）
    const rounded = Math.round(v * 2) / 2;
    return { date: d, rate: rounded };
  });
  return arr;
}

// 完全固定からの擬似
function synthSeriesFixed(start, end, baseValue=100){
  const days = enumerateDates(start, end);
  let v = baseValue;
  return days.map(d => {
    const noise = (Math.random() - 0.5) * 0.01; // ±1%
    v = Math.max(0.0001, v * (1 + noise));
    const rounded = Math.round(v * 2) / 2;
    return { date: d, rate: rounded };
  });
}

/* ------------------- 画面本体 ------------------- */

export default function Rate() {
  const [pair, setPair] = useState("");
  const [period, setPeriod] = useState("7");
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [usedMock, setUsedMock] = useState(false); // 擬似データ使用中か

  useEffect(() => {
    async function run(){
      if (!pair) { setData([]); setError(null); setUsedMock(false); return; }
      const { base, quote } = parsePair(pair);
      const b = aliasFiat(base);
      const q = aliasFiat(quote);
      const { start, end } = rangeFromDays(period);

      try {
        setError(null);
        setData([]);
        setUsedMock(false);

        // 1) timeseries
        try {
          const d1 = await fetchTimeseries(b, q, start, end);
          setData(d1);
          return;
        } catch (e) {
          console.warn("[Rate] timeseries 失敗:", e?.message || e);
        }

        // 2) daily
        try {
          const d2 = await fetchDailySeries(b, q, start, end);
          setData(d2);
          return;
        } catch (e) {
          console.warn("[Rate] daily 失敗:", e?.message || e);
        }

        // 3) frankfurter
        try {
          const d3 = await fetchFrankfurter(b, q, start, end);
          setData(d3);
          return;
        } catch (e) {
          console.warn("[Rate] frankfurter 失敗:", e?.message || e);
        }

        // 4) latest を使って擬似
        try {
          const latest = await fetchLatest(b, q);
          const d4 = synthSeriesFromLatest(latest, start, end);
          setData(d4);
          setUsedMock(true);
          return;
        } catch (e) {
          console.warn("[Rate] latest 取得失敗:", e?.message || e);
        }

        // 5) 完全固定の擬似
        const d5 = synthSeriesFixed(start, end, 100);
        setData(d5);
        setUsedMock(true);
      } catch (e) {
        console.error("[Rate] 全失敗:", e);
        setError("データ取得に失敗しました。時間を置いて再度お試しください。");
      }
    }
    run();
  }, [pair, period]);

  // Y 軸 ticks（0.5 刻み、5 本）
  const yTicks = useMemo(() => {
    if (!data.length) return undefined;
    const vals = data.map(d => d.rate);
    return makeTicks(Math.min(...vals), Math.max(...vals));
  }, [data]);

  const quoteSymbol = useMemo(() => {
    const { quote } = parsePair(pair);
    return symbolOf(quote || "JPY");
  }, [pair]);

  return (
    <div className="page-body">
      <section>
        <Current title="レート推移" className="rate" />

        {/* 通貨ペアセレクト */}
        <div className="field">
          <label className="sr-only" htmlFor="pair-select">通貨ペア</label>
          <div className="selectWrap">
            <select
              id="pair-select"
              className="select"
              value={pair}
              onChange={(e) => setPair(e.target.value)}
            >
              <option value="">通貨ペア選択</option>
              {PAIRS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 期間セレクト */}
        <div className="field">
          <label className="sr-only" htmlFor="period-select">期間</label>
          <div className="selectWrap">
            <select
              id="period-select"
              className="select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="7">7日（1週間）</option>
              <option value="30">30日（1ヶ月）</option>
              <option value="180">半年</option>
            </select>
          </div>
        </div>

        {/* チャートカード（既存デザイン尊重） */}
        <div className="field">
          <div className="chartCard">
            <div className="chartHeader" style={{ justifyContent: "space-between", gap: 8 }}>
              <span className="chartTitle">
                {pair || "通貨ペア未選択"} ／ {period}日
              </span>
              {usedMock && (
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>※API失敗のため仮データ</span>
              )}
            </div>

            <div className="chartArea">
              {error ? (
                <p style={{ color: "#EF4444", textAlign: "center" }}>{error}</p>
              ) : !pair ? (
                <p style={{ color: "#6B7280" }}>通貨ペアと期間を<br />選択してください</p>
              ) : data.length === 0 ? (
                <p style={{ color: "#EF4444" }}>データを取得中...</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5).replace("-", "/")} // MM/DD
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      ticks={yTicks}
                      allowDecimals
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      formatter={(v) => `${Number(v).toLocaleString()} ${quoteSymbol}`}
                      labelFormatter={(label) => label}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#0077B6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
