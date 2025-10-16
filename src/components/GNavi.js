import React from "react";
import { NavLink } from "react-router-dom";
import styles from "./GNavi.module.css";

import homeIcon from "../img/g-home-icon.webp";
import pairIcon from "../img/g-pair-icon.webp";
import rateIcon from "../img/g-rate-icon.webp";

export default function GNavi() {
  const Item = ({ to, label, icon }) => (
    <NavLink
      to={to}
      // isActive に応じて .isActive を自動付与（CSS Modules 対応）
      className={({ isActive }) =>
        `${styles.gnav__item} ${isActive ? styles.isActive : ""}`
      }
      end={to === "/"} // ルートは部分一致を避ける
      aria-label={label}
    >
      <span className={styles.gnav__chip}>
        <img src={icon} alt="" aria-hidden="true" />
      </span>
      <span className={styles.gnav__label}>{label}</span>
    </NavLink>
  );

  return (
    <nav className={styles.gnav} aria-label="グローバルナビゲーション">
      <Item to="/"     label="ホーム"     icon={homeIcon} />
      <Item to="/pair" label="ペア履歴"   icon={pairIcon} />
      <Item to="/rate" label="レート推移" icon={rateIcon} />
    </nav>
  );
}
