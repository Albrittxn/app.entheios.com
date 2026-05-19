// Simple file-backed KV for local dev + minimal production needs.
// One JSON file per key inside .data/. Swap to Vercel KV / Redis later by
// keeping the same surface (kvGet/kvPut/kvDelete/kvList).

import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");

function keyToFile(key: string): string {
  return path.join(DATA_DIR, encodeURIComponent(key) + ".json");
}

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const raw = await readFile(keyToFile(key), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvPut(key: string, val: unknown): Promise<void> {
  await ensureDir();
  await writeFile(keyToFile(key), JSON.stringify(val));
}

export async function kvDelete(key: string): Promise<void> {
  try {
    await rm(keyToFile(key));
  } catch {
    // ignore
  }
}

export async function kvList(prefix: string): Promise<string[]> {
  await ensureDir();
  let files: string[] = [];
  try {
    files = await readdir(DATA_DIR);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => decodeURIComponent(f.slice(0, -5)))
    .filter((k) => k.startsWith(prefix));
}
