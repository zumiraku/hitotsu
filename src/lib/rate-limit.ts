// ログインの総当たり対策。プロセス内のメモリで数えるので、複数台で動かすときは Redis などに置き換える
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const fails = new Map<string, { count: number; until: number }>();

function sweep() {
  const now = Date.now();
  for (const [k, v] of fails) if (v.until < now) fails.delete(k);
}

export function loginBlocked(key: string) {
  sweep();
  const v = fails.get(key);
  if (!v || v.count < MAX_FAILS) return 0;
  return Math.max(0, Math.ceil((v.until - Date.now()) / 60000));
}

export function recordLoginFailure(key: string) {
  sweep();
  const v = fails.get(key);
  fails.set(key, { count: (v?.count ?? 0) + 1, until: Date.now() + WINDOW_MS });
}

export function clearLoginFailures(key: string) {
  fails.delete(key);
}
