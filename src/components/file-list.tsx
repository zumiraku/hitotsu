import { Empty } from "@/components/ui/empty";
import { ago, fileSize } from "@/lib/format";

const EXT_COLOR: Record<string, string> = { xlsx: "#1d7f49", xls: "#1d7f49", csv: "#1d7f49", docx: "#2a66a8", doc: "#2a66a8", pdf: "#b93b35", pptx: "#c8641e", zip: "#66727f", jpg: "#6b4a9e", jpeg: "#6b4a9e", png: "#6b4a9e", ai: "#d28a00", psd: "#2c5da8" };

export type FileItem = { id: string; name: string; size: number; version: number; createdAt: Date; uploader: { name: string } | null };

export function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold text-white" style={{ background: EXT_COLOR[ext] ?? "#66727f" }}>
      {ext.slice(0, 4).toUpperCase()}
    </span>
  );
}

export function FileList({ items }: { items: FileItem[] }) {
  if (items.length === 0) return <Empty>ファイルはありません</Empty>;
  return (
    <ul className="divide-y divide-line">
      {items.map((f) => (
        <li key={f.id} className="flex items-center gap-2.5 py-2">
          <FileIcon name={f.name} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold" title={f.name}>{f.name}</div>
            <div className="truncate text-xs text-muted">v{f.version} · {fileSize(f.size)} · {f.uploader?.name.split(" ")[0]} · {ago(f.createdAt)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
