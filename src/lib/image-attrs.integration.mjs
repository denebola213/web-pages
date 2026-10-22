/**
 * 生成 HTML の <img src="/image/..."> に width / height を付ける。
 *
 * Markdown の ![alt](/image/foo.jpg) は寸法を持たないため、画像の実寸が
 * 確定するまで高さ 0 で描画され、読み込み完了時に本文が跳ねる（CLS）。
 *
 * なぜ mdast/hast プラグインではなくビルド後処理なのか:
 * このプロセッサ（satteri）の mdast 訪問はコードフェンスや見出しなどの
 * ブロック種別に限られ、inline の image ハンドラは呼ばれない。hast 側の
 * element 訪問も、Astro のコンテンツ描画経路では発火しなかった。
 * 出力は静的 HTML だけなので、ここで一括して直すほうが確実で検証も容易い。
 *
 * 対応形式: PNG / JPEG / GIF。判定できないもの（WebP・SVG・外部 URL・
 * 既に width を持つもの）は触らない。
 * CSS 側の `img { height: auto }` が前提（無いと縦横比が崩れる）。
 */
import { readFileSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// src/lib/ から見た public/ は 2 階層上
const PUBLIC = new URL('../../public/', import.meta.url).pathname;

/** PNG / JPEG / GIF のヘッダから {width, height} を読む */
export function dimensions(buf) {
  // PNG: IHDR の幅・高さ（ビッグエンディアン）
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // GIF: 論理画面の幅・高さ（リトルエンディアン）
  if (buf.length > 10 && buf.subarray(0, 3).toString('latin1') === 'GIF') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  // JPEG: SOF マーカーまで走査
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      const isSOF =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  }
  return null;
}

const cache = new Map();
function sizeOf(src) {
  if (cache.has(src)) return cache.get(src);
  let size = null;
  try {
    size = dimensions(readFileSync(join(PUBLIC, src)));
  } catch {
    size = null;
  }
  cache.set(src, size);
  return size;
}

const IMG = /<img\b([^>]*?)\bsrc="(\/image\/[^"]+)"([^>]*?)\/?>/g;

export default function imageAttrs() {
  return {
    name: 'image-attrs',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        let added = 0;
        for (const file of await walk(out)) {
          if (!file.endsWith('.html')) continue;
          const html = await readFile(file, 'utf8');
          let hit = 0;
          const next = html.replace(IMG, (m, before, src, after) => {
            if (/\bwidth=/.test(before + after)) return m;
            const size = sizeOf(src);
            if (!size) return m;
            hit += 1;
            const rest = (before + after).replace(/\s+/g, ' ').trim();
            return `<img ${rest ? rest + ' ' : ''}src="${src}" width="${size.width}" height="${size.height}" decoding="async">`;
          });
          if (hit) {
            await writeFile(file, next);
            added += hit;
          }
        }
        logger.info(`${added} 枚の画像に width/height を付与`);
      },
    },
  };
}

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
