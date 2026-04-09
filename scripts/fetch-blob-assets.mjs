import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrlRaw = process.env.MOMO_BLOB_BASE_URL;
const baseUrl = baseUrlRaw ? baseUrlRaw.replace(/\/+$/, '') : '';

async function fetchBuffer(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText} (${url})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function saveFile(localPath, fileBuffer) {
  const targetPath = path.resolve(localPath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, fileBuffer);
}

async function exists(targetPath) {
  try {
    await access(path.resolve(targetPath));
    return true;
  } catch {
    return false;
  }
}

function normalizeIconPath(iconValue) {
  if (typeof iconValue !== 'string') return null;
  const trimmed = iconValue.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) return null;
  if (trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('data:')) return null;

  let normalized = trimmed.replace(/\\/g, '/');
  if (normalized.startsWith('/')) normalized = normalized.slice(1);
  if (normalized.startsWith('./')) normalized = normalized.slice(2);
  if (normalized.includes('..')) return null;
  return normalized;
}

function collectReferencedAssetPaths(navData) {
  const collected = new Set();
  const topLevelAssetKeys = ['favicon', 'favicon192', 'favicon512', 'appleTouchIcon', 'siteManifest'];

  for (const key of topLevelAssetKeys) {
    const assetPath = normalizeIconPath(navData?.[key]);
    if (assetPath) {
      collected.add(assetPath);
    }
  }

  const categories = Array.isArray(navData?.categories) ? navData.categories : [];

  for (const category of categories) {
    const entries = [];
    if (Array.isArray(category?.websites)) entries.push(...category.websites);
    if (Array.isArray(category?.items)) entries.push(...category.items);

    for (const entry of entries) {
      const iconPath = normalizeIconPath(entry?.icon);
      if (iconPath) {
        collected.add(iconPath);
      }
    }
  }

  return [...collected];
}

async function validateLocalAssets() {
  const hasLocalJson = await exists('momo-nav.json');
  if (!hasLocalJson) return { mode: 'none' };

  const navJsonRaw = await readFile(path.resolve('momo-nav.json'));
  const navData = JSON.parse(navJsonRaw.toString('utf8'));
  const assetPaths = collectReferencedAssetPaths(navData);

  const missing = [];
  for (const assetPath of assetPaths) {
    const found = await exists(assetPath);
    if (!found) missing.push(assetPath);
  }

  return {
    mode: 'local',
    assetCount: assetPaths.length,
    missing,
  };
}

async function main() {
  if (!baseUrl) {
    const local = await validateLocalAssets();
    if (local.mode === 'none') {
      console.log('[blob-sync] MOMO_BLOB_BASE_URL not set and no local momo-nav.json found. Skip.');
      return;
    }

    if (local.missing.length === 0) {
      console.log(`[blob-sync] using local assets (1 json + ${local.assetCount} referenced assets).`);
      return;
    }

    console.warn(
      `[blob-sync] using local momo-nav.json, but ${local.missing.length} referenced assets are missing.`
    );
    console.warn('[blob-sync] first missing paths:', local.missing.slice(0, 5).join(', '));
    console.warn('[blob-sync] set MOMO_BLOB_BASE_URL to auto-sync missing files from Blob.');
    return;
  }

  const navJsonUrl = `${baseUrl}/momo-nav.json`;
  const navJsonBuffer = await fetchBuffer(navJsonUrl);
  await saveFile('momo-nav.json', navJsonBuffer);
  console.log(`[blob-sync] downloaded momo-nav.json (${navJsonBuffer.length} bytes)`);

  const navData = JSON.parse(navJsonBuffer.toString('utf8'));
  const assetPaths = collectReferencedAssetPaths(navData);

  for (const assetPath of assetPaths) {
    const assetUrl = `${baseUrl}/${assetPath}`;
    const assetBuffer = await fetchBuffer(assetUrl);
    await saveFile(assetPath, assetBuffer);
    console.log(`[blob-sync] downloaded ${assetPath} (${assetBuffer.length} bytes)`);
  }

  console.log(`[blob-sync] completed: 1 json + ${assetPaths.length} referenced assets`);
}

main().catch((error) => {
  console.error('[blob-sync] failed:', error);
  process.exit(1);
});
