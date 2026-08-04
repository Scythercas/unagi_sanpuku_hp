#!/usr/bin/env node
// microCMS の gallery / menu 画像をビルド前にローカルへ取得する（CLAUDE.md 画像パイプライン契約）。
// 実行時に microCMS へアクセスさせないため、最終 HTML には microCMS の画像 URL を残さない。

import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from 'microcms-js-sdk';

try {
  process.loadEnvFile();
} catch {
  // .env が無い環境（CI 等）では process.env（Actions Secrets）をそのまま使う
}

const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = process.env.MICROCMS_API_KEY;

if (!serviceDomain || !apiKey) {
  console.error(
    '[prebuild-images] MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が設定されていません（.env またはリポジトリの Secrets を確認）。壊れたサイトを公開しないためビルドを中止します。'
  );
  process.exit(1);
}

const client = createClient({ serviceDomain, apiKey });

const IMAGES_DIR = path.resolve('src/assets/images');
const IMAGE_MAP_PATH = path.resolve('src/data/image-map.json');
const IMGIX_PARAMS = 'fm=jpg&w=2000&q=88';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 15000;

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function idFor(url) {
  const base = url.split('?')[0];
  return createHash('sha1').update(base).digest('hex').slice(0, 16);
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      console.warn(
        `[prebuild-images] 取得失敗（${attempt}/${MAX_RETRIES}）: ${url} — ${err.message}`
      );
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

// 取得失敗（404 等）は警告のみでスキップし、全体のビルドは止めない
async function downloadImage(image) {
  if (!image?.url) return null;

  const filename = `${idFor(image.url)}.jpg`;
  const absPath = path.join(IMAGES_DIR, filename);
  const globPath = `/src/assets/images/${filename}`;

  if (!(await fileExists(absPath))) {
    try {
      const buffer = await fetchWithRetry(`${image.url}?${IMGIX_PARAMS}`);
      await writeFile(absPath, buffer);
      console.log(`[prebuild-images] 取得: ${filename}`);
    } catch (err) {
      console.warn(`[prebuild-images] スキップ（取得不能）: ${image.url} — ${err.message}`);
      return null;
    }
  }

  return { localPath: globPath, width: image.width, height: image.height };
}

async function buildImageMap(list, altKey) {
  const map = {};
  for (const item of list) {
    const result = await downloadImage(item.image);
    if (result) {
      map[item.id] = { ...result, alt: item[altKey] ?? '' };
    }
  }
  return map;
}

async function main() {
  await mkdir(IMAGES_DIR, { recursive: true });
  await mkdir(path.dirname(IMAGE_MAP_PATH), { recursive: true });

  const [{ contents: menuList }, { contents: galleryList }] = await Promise.all([
    client.getList({ endpoint: 'menu', queries: { limit: 100 } }),
    client.getList({ endpoint: 'gallery', queries: { limit: 100 } }),
  ]);

  const imageMap = {
    generatedAt: new Date().toISOString(),
    menu: await buildImageMap(menuList, 'name'),
    gallery: await buildImageMap(galleryList, 'caption'),
  };

  await writeFile(IMAGE_MAP_PATH, `${JSON.stringify(imageMap, null, 2)}\n`);

  console.log(
    `[prebuild-images] 完了: menu ${Object.keys(imageMap.menu).length}件 / gallery ${Object.keys(imageMap.gallery).length}件`
  );
}

main().catch((err) => {
  console.error('[prebuild-images] 予期しないエラー:', err);
  process.exit(1);
});
