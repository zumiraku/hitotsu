import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

// ファイル本体の置き場所。ローカルディスクか S3 互換ストレージを env で切り替える
export interface Storage {
  put(key: string, data: Uint8Array, contentType?: string): Promise<void>;
  get(key: string): Promise<{ body: Readable; size?: number } | null>;
  delete(key: string): Promise<void>;
}

class LocalStorage implements Storage {
  constructor(private root: string) {}

  private resolve(key: string) {
    const p = path.resolve(this.root, key);
    if (!p.startsWith(path.resolve(this.root) + path.sep)) throw new Error("不正なパスです");
    return p;
  }

  async put(key: string, data: Uint8Array) {
    const p = this.resolve(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, data);
  }

  async get(key: string) {
    const p = this.resolve(key);
    try {
      const s = await stat(p);
      return { body: createReadStream(p), size: s.size };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}

class S3Storage implements Storage {
  private client: import("@aws-sdk/client-s3").S3Client | null = null;
  constructor(private bucket: string) {}

  private async s3() {
    if (!this.client) {
      const { S3Client } = await import("@aws-sdk/client-s3");
      this.client = new S3Client({
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: !!process.env.S3_ENDPOINT,
        credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" } : undefined,
      });
    }
    return this.client;
  }

  async put(key: string, data: Uint8Array, contentType?: string) {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.s3()).send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }));
  }

  async get(key: string) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    try {
      const res = await (await this.s3()).send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return { body: res.Body as Readable, size: res.ContentLength };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.s3()).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let instance: Storage | null = null;

export function storage(): Storage {
  if (instance) return instance;
  if (process.env.STORAGE_DRIVER === "s3") {
    if (!process.env.S3_BUCKET) throw new Error("STORAGE_DRIVER=s3 のときは S3_BUCKET が必要です");
    instance = new S3Storage(process.env.S3_BUCKET);
  } else {
    instance = new LocalStorage(process.env.STORAGE_DIR || path.join(process.cwd(), "storage"));
  }
  return instance;
}

export const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 50) * 1024 * 1024;

// 実行できてしまう拡張子は受け付けない
const BLOCKED_EXT = new Set(["exe", "bat", "cmd", "com", "msi", "scr", "ps1", "vbs", "js", "jar", "sh"]);

export function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function isBlockedExt(name: string) {
  return BLOCKED_EXT.has(extOf(name));
}

// 保存キー。日付でフォルダを切り、元のファイル名は DB 側に持つ
export function storageKey(id: string, name: string) {
  const d = new Date();
  const ext = extOf(name);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${id}${ext ? "." + ext : ""}`;
}
