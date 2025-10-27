// src/App.js
import React, { useState, useCallback } from "react";
import { Routes, Route, Link } from "react-router-dom";

import Splash from "./components/Splash";
import TutorialModal from "./components/TutorialModal"; // 既存が無ければ後述の最小版を使ってください
import Home from "./pages/Home";
import Pair from "./pages/Pair";
import Rate from "./pages/Rate";
import GNavi from "./components/GNavi";
import AboutDrawer from "./components/AboutDrawer.jsx";
import ScrollToTop from "./components/ScrollToTop";

import "./App.css";

const TUTORIAL_ONLY_ONCE = true; // ← 確認が終わったら true に変更

export default function App() {

  const [splashVisible, setSplashVisible] = useState(true);

  const [tutorialOpen, setTutorialOpen] = useState(false);

  const [aboutOpen, setAboutOpen] = useState(false);
  const toggleAbout = () => setAboutOpen((v) => !v);

  // スプラッシュ終了（3秒＋フェード後に Splash から呼ばれる）
  const handleSplashDone = useCallback(() => {
    setSplashVisible(false);

    if (TUTORIAL_ONLY_ONCE) {
      // 「1回だけ」モード
      const seen = localStorage.getItem("hasSeenTutorial");
      if (!seen) {
        setTutorialOpen(true);
        localStorage.setItem("hasSeenTutorial", "1");
      }
    } else {
      // 「毎回」モード（確認用）
      setTutorialOpen(true);
    }
  }, []);

  // もし開発中に強制的にチュートリアルをまた見たくなったら：
  // F12 コンソールで localStorage.removeItem("hasSeenTutorial")

  return (
    <div className="app-wrap">
      {/* スプラッシュ（3秒表示→フェード→onDone） */}
      {splashVisible && (
        <Splash
          duration={3000}
          fade={400}
          onDone={handleSplashDone}
          version="v1.0.0"
        />
      )}

      {/* ヘッダー（ロゴ左・ハンバーガー右） */}
      <header className="app-header">
        <Link to="/" className="app-logo">
          <img src={require("./img/logo.png")} alt="ゲンチレート" />
        </Link>

        <button
          type="button"
          className="hamburger-btn"
          aria-label="メニュー"
          onClick={toggleAbout}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </header>

      {/* ページ本体 */}
      <main className="app-main">
        <ScrollToTop /> 
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pair" element={<Pair />} />
          <Route path="/rate" element={<Rate />} />
        </Routes>
      </main>

      {/* フッター（グローバルナビ） */}
      <GNavi />

      {/* About ドロワー */}
      <AboutDrawer open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {/* チュートリアル（モーダル） */}
      <TutorialModal open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </div>
  );
}
