import React, { useEffect, useMemo, useState } from "react";
import Current from "../components/ui/Current";
import Field from "../components/ui/Field";
import ResultBox from "../components/ui/ResultBox";
import Button from "../components/ui/Button";

import pairIconR from "../img/pair-r-icon.webp";

import { getRate, parsePair, symbolOf, jpName } from "../lib/rates";
import { addHistory } from "../lib/history";
import { Link } from "react-router-dom";

// 必須ペア（指定どおり）
const PAIRS = [
  "USD-JPY","EUR-JPY","GBP-JPY","AUD-JPY","CAD-JPY","NZD-JPY","CHF-JPY",
  "KRW-JPY","CNH-JPY","HKD-JPY","TWD-JPY","THB-JPY","SGD-JPY","PHP-JPY",
  "MYR-JPY","IDR-JPY","VND-JPY","INR-JPY","AED-JPY","SEK-JPY","DKK-JPY",
  "NOK-JPY","TRY-JPY","MXN-JPY","ZAR-JPY",
];

export default function Home() {
  const [pair, setPair] = useState("");     // 例: "USD-JPY"
  const [amount, setAmount] = useState(""); // 入力金額（テキスト）
  const [memo, setMemo] = useState("");     // 任意
  const [resultNode, setResultNode] = useState(null); // ResultBox に渡す JSX
  const [isLoading, setIsLoading] = useState(false);

  // ペア変更時に金額をリセット（あなたの要望）
  useEffect(() => {
    if (!pair) return;
    setAmount("");              // 金額クリア
    setResultNode(null);        // 結果もクリア
  }, [pair]);

  // 入力中でも即時で換算したい → pair と amount を監視
  useEffect(() => {
    async function calc() {
      const { base, quote } = parsePair(pair);
      if (!base || !quote) {
        setResultNode(null);
        return;
      }
      const num = parseFloat(String(amount).replace(/,/g, ""));
      if (!amount || Number.isNaN(num)) {
        setResultNode(null);
        return;
      }
      try {
        setIsLoading(true);
        const rate = await getRate(base, quote); // API呼び出し
        const converted = Math.round(num * rate * 100) / 100;

        const baseSym = symbolOf(base);
        const quoteSym = symbolOf(quote);

        // 1行目：換算結果
        const line1 = (
          <span>
            {baseSym}{num.toLocaleString()} → {quoteSym}{converted.toLocaleString()}
          </span>
        );
        // 2行目：一単位（小さめ）
        const line2 = (
          <small style={{ display: "block", fontSize: "0.9em", color: "#6B7280", marginTop: 2 }}>
            {baseSym}1 = {quoteSym}{rate.toLocaleString()}
          </small>
        );
        setResultNode(<>{line1}{line2}</>);
      } catch (e) {
        console.error(e);
        setResultNode(
          <span style={{ color: "#EF4444" }}>レート取得に失敗しました。時間を置いて再度お試しください。</span>
        );
      } finally {
        setIsLoading(false);
      }
    }
    calc();
  }, [pair, amount]);

  // 金額の右横に出す単位（記号）
  const rightUnit = useMemo(() => {
    const { base } = parsePair(pair);
    return symbolOf(base) || "";
  }, [pair]);

  // 履歴登録
  // 履歴登録
function handleRegister() {
  const { base, quote } = parsePair(pair);
  const num = parseFloat(String(amount).replace(/,/g, ""));
  if (!base || !quote) return alert("通貨ペアを選んでください。");
  if (!amount || Number.isNaN(num)) return alert("金額は数値で入力してください。");

  (async () => {
    try {
      const rate = await getRate(base, quote);
      const converted = Math.round(num * rate * 100) / 100;

      const now = new Date();
      const dateJP = now.toLocaleDateString("ja-JP");
      
      const baseSym = symbolOf(base);
      const quoteSym = symbolOf(quote);

      addHistory({
       date: dateJP,
       left: `${baseSym}${num.toLocaleString()}`,
       right: `${quoteSym}${converted.toLocaleString()}\n${baseSym}1 = ${quoteSym}${rate.toLocaleString()}`,
       memo: memo || "",
      });


      alert("ペア履歴に追加しました。");
    } catch (err) {
      console.error(err);
      alert("登録時にレート取得に失敗しました。");
    }
  })();
}


  // 表示ラベル（日本語）
  function pairLabel(p) {
    const { base, quote } = parsePair(p);
    if (!base || !quote) return p;
    return `${jpName(base)} ${base} → ${jpName(quote)} ${quote}`;
  }

  return (
    <section className="home-wrap">
      <div className="page-body">
        <Current title="ホーム" className="home" />

        <form className="card-form" onSubmit={(e)=>e.preventDefault()}>
          {/* 通貨ペア選択（日本語ラベル） */}
          <Field>
            <div className="oneInput oneInput--prefix">
              {rightUnit && <span className="oneInput__unit oneInput__unit--prefix">{rightUnit}</span>}
              <input
                id="amount"
                className="oneInput__control"
                type="text"
                inputMode="decimal"
                placeholder="金額入力（数値のみ）"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </Field>

          {/* 金額入力：一体型（右端に単位“記号”を表示） */}
          <Field>
            <div className="oneInput">
              <input
                id="amount"
                className="oneInput__control"
                type="text"
                inputMode="decimal"
                placeholder="金額入力（数値のみ）"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {rightUnit && <span className="oneInput__unit">{rightUnit}</span>}
            </div>
          </Field>

          {/* 結果表示（自動） */}
          <Field>
            <ResultBox
              value={isLoading ? <span>計算中...</span> : resultNode}
              placeholder={<>入力結果</>}
            />
          </Field>

          {/* メモ */}
          <Field>
            <textarea
              id="memo"
              className="textarea like-input"
              rows={4}
              placeholder="メモ"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </Field>

          {/* ボタン行（登録のみ） */}
          <div className="actions">
            <Button variant="outline" onClick={handleRegister}>★通貨ペアを登録</Button>
          </div>

          {/* ペア履歴リンク（左にアイコン追加） */}
          <p className="link-row">
            <Link to="/pair" className="inline-link">
              <img
                src={pairIconR}
                alt=""
                className="icon"
                style={{ width: 16, height: 16, verticalAlign: "-2px", marginRight: 2 }}
              />
              ペア履歴
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
