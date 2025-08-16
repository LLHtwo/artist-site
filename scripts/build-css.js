import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('src/styles');
const entry = path.join(srcDir, 'main.css');
const outPath = path.resolve('dist/main.css');

function readImports(file) {
  let css = fs.readFileSync(file, 'utf8');
  return css.replace(/@import\s+['"](.+?)['"];?/g, (_, rel) => {
    const full = path.resolve(path.dirname(file), rel);
    return readImports(full);
  });
}

let css = readImports(entry);
css = css.replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, '')
         .replace(/\s+/g, ' ')
         .replace(/\s*([{};:,])\s*/g, '$1')
         .trim();

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, css);
console.log(`CSS built to ${outPath}`);
