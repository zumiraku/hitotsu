import { config } from "dotenv";
import { vi } from "vitest";

// テスト用 DB（.env.test）に向ける。既存の .env より優先
config({ path: ".env.test", override: true });

// Server Action が使う Next.js の仕組みは、テストでは最小限の代替に差し替える
export class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

const cookieJar = new Map<string, string>();
export const cookieStore = {
  get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
  set: (name: string, value: string) => void cookieJar.set(name, value),
  delete: (name: string) => void cookieJar.delete(name),
  clear: () => cookieJar.clear(),
};

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
  headers: async () => new Headers({ "user-agent": "vitest" }),
}));
