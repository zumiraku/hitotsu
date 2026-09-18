"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// ?deleted=1 のようなクエリで渡された完了メッセージを数秒だけ出す
export function Flash({ messages }: { messages: Record<string, string> }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = Object.keys(messages).find((k) => params.has(k));

  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      next.delete(key);
      router.replace(next.size ? `${pathname}?${next}` : pathname);
    }, 4000);
    return () => clearTimeout(t);
  }, [key, params, pathname, router]);

  if (!key) return null;
  return <p className="msg-ok mb-3">{messages[key]}</p>;
}
