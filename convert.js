const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const inputDir = path.join(process.cwd(), "src", "img");
const outputDir = inputDir;

console.log("[CWD]", process.cwd());
console.log("[INPUT]", inputDir);

let count = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(p);
      continue;
    }
    const lower = entry.name.toLowerCase();
    if (lower.endsWith(".svg")) {
      const out = path.join(outputDir, path.relative(inputDir, p))
        .replace(/\.svg$/i, ".webp");
      const outDir = path.dirname(out);
      fs.mkdirSync(outDir, { recursive: true });

      console.log(`→ Convert: ${path.relative(inputDir, p)}  ->  ${path.relative(inputDir, out)}`);
      sharp(p)
        .webp({ quality: 80 })
        .toFile(out)
        .then(() => {
          count++;
          console.log(`   OK: ${path.basename(out)}`);
        })
        .catch(err => console.error(`   ERR: ${err.message}`));
    }
  }
}

walk(inputDir);

// 終了時に少し待ってサマリ表示（簡易）
setTimeout(() => {
  console.log(`\nDone. Converted ${count} file(s).`);
}, 500);