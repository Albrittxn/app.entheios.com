// Local-dev shim for @vercel/edge-config. EDGE_CONFIG isn't configured
// locally, so every read returns `undefined` and the rest of the app falls
// back gracefully — admin (ryan@entheios.com) can still sign in because
// lib/permissions.ts special-cases the hardcoded ADMIN_EMAIL before
// checking Edge Config.

export async function get<T = unknown>(_key: string): Promise<T | undefined> {
  return undefined;
}

export async function getAll<T = unknown>(): Promise<T | undefined> {
  return undefined;
}

export async function has(_key: string): Promise<boolean> {
  return false;
}

export async function digest(): Promise<string> {
  return "";
}

const def = { get, getAll, has, digest };
export default def;
