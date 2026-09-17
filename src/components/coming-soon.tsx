import Link from "next/link";

export function ComingSoon({ title, stage, items }: { title: string; stage: number; items: string[] }) {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-0.5 text-[13px] text-muted">ステージ{stage}で実装します</p>
      </div>
      <div className="card">
        <div className="card-body">
          <p className="mb-2 text-[13px] text-ink-2">この画面に入る予定の機能</p>
          <ul className="list-disc space-y-1 pl-5 text-[13.5px]">
            {items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] text-muted">
            全体の計画は <Link href="/plan" className="text-primary underline">開発計画</Link> を参照
          </p>
        </div>
      </div>
    </div>
  );
}
