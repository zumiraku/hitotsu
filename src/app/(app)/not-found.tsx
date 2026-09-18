import Link from "next/link";

export default function NotFound() {
  return (
    <div className="box mx-auto mt-10 max-w-md">
      <div className="box-body text-[13px]">
        <p className="font-bold">ページが見つかりません。</p>
        <p className="mt-1">URL が間違っているか、データが削除された可能性があります。</p>
        <p className="mt-3">
          <Link href="/">ホームへ戻る</Link>
        </p>
      </div>
    </div>
  );
}
