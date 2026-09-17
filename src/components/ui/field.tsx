export function Field({ label, htmlFor, required, errors, hint, children, className = "" }: { label: string; htmlFor?: string; required?: boolean; errors?: string[]; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={htmlFor} className="text-[12.5px] text-muted">
        {label}
        {required ? <span className="text-bad"> *</span> : null}
      </label>
      {children}
      {errors?.length ? <p className="text-[12px] text-bad">{errors.join("、")}</p> : hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}

export const inputBase = "h-9 rounded-[7px] border border-line bg-surface px-2.5 text-[13.5px] focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary-soft aria-invalid:border-bad";
export const inputClass = `${inputBase} w-full`;
export const textareaClass = "w-full rounded-[7px] border border-line bg-surface px-2.5 py-2 text-[13.5px] leading-relaxed focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary-soft aria-invalid:border-bad";
