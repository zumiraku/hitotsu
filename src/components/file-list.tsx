import { DeleteFileButton } from "@/components/files/delete-file-button";
import { groupVersions } from "@/lib/files";
import { fileSize, fmtDateTime } from "@/lib/format";

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

export function FileList({ items, editable = false }: { items: FileItem[]; editable?: boolean }) {
  if (items.length === 0) return <p className="text-muted">ファイルはありません。</p>;
  const groups = groupVersions(items).sort((a, b) => b.latest.createdAt.getTime() - a.latest.createdAt.getTime());
  return (
    <ul className="text-[12.5px]">
      {groups.map(({ latest: f, older }) => (
        <li key={f.id} className="border-b border-line-2 py-1.5 last:border-b-0">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <a href={`/api/files/${f.id}`} className="break-all" title="ダウンロード">
                {f.name}
              </a>
              <div className="text-[11px] text-muted">
                第{f.version}版　{fileSize(f.size)}　{f.uploader?.name}　{fmtDateTime(f.createdAt)}
              </div>
            </div>
            {editable ? <DeleteFileButton id={f.id} name={f.name} version={f.version} /> : null}
          </div>
          {older.length ? (
            <details className="mt-0.5">
              <summary className="cursor-pointer text-[11px] text-link">過去の版（{older.length}）</summary>
              <ul className="mt-0.5 pl-3 text-[11px] text-muted">
                {older.map((o) => (
                  <li key={o.id} className="flex items-center gap-2">
                    <a href={`/api/files/${o.id}`}>第{o.version}版</a>
                    <span>{fileSize(o.size)}</span>
                    <span>{o.uploader?.name}</span>
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
