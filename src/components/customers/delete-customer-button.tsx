"use client";

import { useState, useTransition } from "react";
import { deleteCustomer } from "@/actions/customers";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const onClick = () => {
    if (!window.confirm(`「${name}」を削除します。よろしいですか？\n（一覧には表示されなくなりますが、変更履歴には残ります）`)) return;
    start(async () => {
      const res = await deleteCustomer(id);
      if (res?.message) setMessage(res.message);
    });
  };

  return (
    <span className="relative">
      <button type="button" onClick={onClick} disabled={pending} className="btn">
        {pending ? "削除中..." : "削除"}
      </button>
      {message ? <span role="alert" className="msg-bad absolute right-0 top-full z-10 mt-1 w-72 text-[12px]">{message}</span> : null}
    </span>
  );
}
