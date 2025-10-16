import React, { useEffect, useState } from "react";

export default function Splash({
  duration = 3000,
  fade = 400,
  onDone = () => {},
  version = "v1.0.0",
}) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // 3秒待ってからフェード開始
    const showTimer = setTimeout(() => {
      setFading(true);
      // フェード時間が終わってから onDone
      const doneTimer = setTimeout(onDone, fade);
      return () => clearTimeout(doneTimer);
    }, duration);
    return () => clearTimeout(showTimer);
  }, [duration, fade, onDone]);

  // フルスクリーン固定 & フェード
  const wrapStyle = {
    position: "fixed",
    inset: 0,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    zIndex: 9999,
    transition: `opacity ${fade}ms ease`,
    opacity: fading ? 0 : 1,
  };

  const innerStyle = {
    display: "grid",
    justifyItems: "center",
    gap: 10,
  };

  const verStyle = {
    fontSize: 12,
    color: "#9CA3AF", // 薄グレー（コーポレート寄せ）
    letterSpacing: ".02em",
    marginTop: 6,
  };

  return (
    <div style={wrapStyle} aria-hidden={false} role="presentation">
      <div style={innerStyle}>
        <img
          src={require("../img/logo.png")}
          alt="ゲンチレート"
          style={{ width: 240, height: "auto", display: "block" }}
        />
        <div style={verStyle}>{version}</div>
      </div>
    </div>
  );
}
