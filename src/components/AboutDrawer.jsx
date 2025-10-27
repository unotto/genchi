// バックアップ
const exportHistory = () => {
  const data = localStorage.getItem("genchi.history") || "[]";
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `genchi-history-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

// 復元
const importHistory = (file) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target.result);
      if (Array.isArray(json)) {
        localStorage.setItem("genchi.history", JSON.stringify(json));
        alert("履歴を復元しました！");
        window.location.reload();
      } else {
        alert("ファイル形式が違います");
      }
    } catch {
      alert("読み込みエラーです");
    }
  };
  reader.readAsText(file);
};
