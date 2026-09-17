import { DeleteFileButton } from "@/components/files/delete-file-button";
import { Icon } from "@/components/icons";
import { Empty } from "@/components/ui/empty";
import { groupVersions } from "@/lib/files";
import { ago, fileSize, fmtDateTime } from "@/lib/format";

const EXT_COLOR: Record<string, string> = { xlsx: "#1d7f49", xls: "#1d7f49", csv: "#1d7f49", docx: "#2a66a8", doc: "#2a66a8", pdf: "#b93b35", pptx: "#c8641e", ppt: "#c8641e", zip: "#66727f", jpg: "#6b4a9e", jpeg: "#6b4a9e", png: "#6b4a9e", gif: "#6b4a9e", ai: "#d28a00", psd: "#2c5da8", txt: "#66727f" };

export type FileItem = {
  id: string;
  name: string;
  size: number;
  version: number;
  createdAt: Date;
  projectId: string | null;
  customerId: string | null;
  uploader: { name: string } | null;
};

export function FileIcon({ name, size = 32 }: { name: string; size?: number }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return (
    <span className="flex shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold text-white" style={{ background: EXT_COLOR[ext] ?? "#66727f", width: size, height: size }}>
      {ext.slice(0, 4).toUpperCase()}
    </span>
  );
}

export function FileList({ items, editable = false }: { items: FileItem[]; editable?: boolean }) {
  if (items.length === 0) return <Empty>ファイルはありません</Empty>;
  const groups = groupVersions(items).sort((a, b) => b.latest.createdAt.getTime() - a.latest.createdAt.getTime());
  return (
    <ul className="divide-y divide-line">
      {groups.map(({ latest: f, older }) => (
        <li key={f.id} className="py-2">
          <div className="group flex items-center gap-2.5">
            <FileIcon name={f.name} />
            <div className="min-w-0 flex-1">
              <a href={`/api/files/${f.id}`} className="block truncate font-bold hover:underline" title={`${f.name} をダウンロード`}>
                {f.name}
              </a>
              <div className="truncate text-xs text-muted">
                v{f.version} · {fileSize(f.size)} · {f.uploader?.name.split(" ")[0]} · {ago(f.createdAt)}
              </div>
            </div>
            <a href={`/api/files/${f.id}`} aria-label="ダウンロード" title="ダウンロード" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
              <Icon name="download" size={15} />
            </a>
            {editable ? <DeleteFileButton id={f.id} name={f.name} version={f.version} /> : null}
          </div>
          {older.length ? (
            <details className="mt-1 pl-[42px]">
              <summary className="cursor-pointer text-xs text-muted hover:text-ink">過去の版（{older.length}）</summary>
              <ul className="mt-1 flex flex-col gap-1">
                {older.map((o) => (
                  <li key={o.id} className="flex items-center gap-2 text-xs text-muted">
                    <a href={`/api/files/${o.id}`} className="tnum hover:underline">v{o.version}</a>
                    <span>{fileSize(o.size)}</span>
                    <span>{o.uploader?.name.split(" ")[0]}</span>
                    <span>{fmtDateTime(o.createdAt)}</span>
                    {editable ? <DeleteFileButton id={o.id} name={o.name} version={o.version} /> : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
