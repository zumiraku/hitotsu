// 入力画面の1行。左に項目名、右に入力欄を置く表形式
export function Field({ label, htmlFor, required, errors, hint, children }: { label: string; htmlFor?: string; required?: boolean; errors?: string[]; hint?: string; children: React.ReactNode }) {
  return (
    <div className="frow">
      <label htmlFor={htmlFor} className="flabel">
        {label}
        {required ? <span className="req">必須</span> : null}
      </label>
      <div className="fval">
        {children}
        {errors?.length ? <p className="mt-1 text-[12px] text-bad">{errors.join("、")}</p> : hint ? <p className="mt-1 text-[12px] text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export const inputBase = "inp";
export const inputClass = "inp w-full";
export const textareaClass = "txt";
