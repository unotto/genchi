import React, { useEffect, useMemo, useState } from "react";
import Current from "../components/ui/Current";
import Field from "../components/ui/Field";
import ResultBox from "../components/ui/ResultBox";
import Button from "../components/ui/Button";

import pairIconR from "../img/pair-r-icon.webp";

import { getRate, parsePair, symbolOf, jpName } from "../lib/rates";
import { addHistory } from "../lib/history";
import { Link } from "react-router-dom";

// 必須ペア
const PAIRS = [
  "USD-JPY","EUR-JPY","GBP-JPY","AUD-JPY","CAD-JPY","NZD-JPY","CHF-JPY",
  "KRW-JPY","CNH-JPY","HKD-JPY","TWD-JPY","THB-JPY","SGD-JPY","PHP-JPY",
  "MYR-JPY","IDR-JPY","VND-JPY","INR-JPY","AED-JPY","SEK-JPY","DKK-JPY",
  "NOK-JPY","TRY-JPY","MXN-JPY","ZAR-JPY",
];

export default function Home() {
  const [pair, setPair] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [resultNode, setResultNode] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // ★ トースト用
  const [toast, setToast] = useState("");

  // ペア変更時にリセット
  useEffect(() => {
    if (!pair) return;
    setAmount("");
    setResultNode(null);
  }, [pair]);

  // 即時計算
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
        const rate = await getRate(base, quote);
        const converted = Math.round(num * rate * 100) / 100;

        const Money = ({ sym, children }) => (
          <span className="money">
            <span className="money__sym">{sym}</span>
            <span className="money__num">{children}</span>
          </span>
        );

        const line1 = (
          <span>
            <Money sym={symbolOf(base)}>{num.toLocaleString()}</Money>
            {" → "}
            <Money sym={symbolOf(quote)}>{converted.toLocaleString()}</Money>
          </span>
        );

        const line2 = (
          <small style={{ display: "block", fontSize: "0.9em", color: "#6B7280", marginTop: 2 }}>
            <Money sym={symbolOf(base)}>1</Money>
            {" = "}
            <Money sym={symbolOf(quote)}>{rate.toLocaleString()}</Money>
          </small>
        );

        setResultNode(<>{line1}{line2}</>);
      } catch (e) {
        console.error(e);
        setResultNode(
          <span style={{ color: "#EF4444" }}>
            レート取得に失敗しました
          </span>
        );
      } finally {
        setIsLoading(false);
      }
    }
    calc();
  }, [pair, amount]);

  // 金額入力の単位
  const rightUnit = useMemo(() => {
    const { base } = parsePair(pair);
    return symbolOf(base) || "";
  }, [pair]);

  // 履歴登録
  async function handleRegister() {
    const { base, quote } = parsePair(pair);
    const num = parseFloat(String(amount).replace(/,/g, ""));

    if (!base || !quote) {
      showToast("通貨ペアを選んでください");
      return;
    }
    if (!amount || Number.isNaN(num)) {
      showToast("金額を入力してください");
      return;
    }

    try {
      const rate = await getRate(base, quote);
      const converted = Math.round(num * rate * 100) / 100;

      const now = new Date();
      const dateJP = now.toLocaleDateString("ja-JP");

      addHistory({
        date: dateJP,
        left: `${symbolOf(base)}${num.toLocaleString()}`,
        right: `${symbolOf(quote)}${converted.toLocaleString()}\n${symbolOf(base)}1 = ${symbolOf(quote)}${rate.toLocaleString()}`,
        memo: memo || "",
      });

      showToast("ペア履歴に追加しました");
    } catch (e) {
      console.error(e);
      showToast("登録に失敗しました");
    }
  }

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 1800);
  }

  function pairLabel(p) {
    const { base, quote } = parsePair(p);
    if (!base || !quote) return p;
    return `${jpName(base)} ${base} → ${jpName(quote)} ${quote}`;
  }

  return (
    <section className="home-wrap">
      <div className="page-body">
        <Current title="ホーム" className="home" />

        <form className="card-form" onSubmit={(e) => e.preventDefault()}>
          <Field>
            <select
              className="select"
              value={pair}
              onChange={(e) => setPair(e.target.value)}
            >
              <option value="">通貨ペア選択</option>
              {PAIRS.map((p) => (
                <option key={p} value={p}>{pairLabel(p)}</option>
              ))}
            </select>
          </Field>

          <Field>
            <div className="oneInput">
              {rightUnit && <span className="oneInput__unit oneInput__unit--left">{rightUnit}</span>}
              <input
                className="oneInput__control"
                type="text"
                inputMode="decimal"
                placeholder="金額入力"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </Field>

          <Field>
            <ResultBox
              value={isLoading ? "計算中…" : resultNode}
              placeholder="入力結果"
            />
          </Field>

          <Field>
            <textarea
              className="textarea like-input"
              rows={4}
              placeholder="メモ"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </Field>

          <div className="actions">
            <Button variant="outline" onClick={handleRegister}>
              ★ 通貨ペアを登録
            </Button>
          </div>

          <p className="link-row">
            <Link to="/pair" className="inline-link">
              <img
                src={pairIconR}
                alt=""
                style={{ width: 16, marginRight: 4 }}
              />
              ペア履歴
            </Link>
          </p>
        </form>
      </div>

      {/* トースト */}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </section>
  );
}
